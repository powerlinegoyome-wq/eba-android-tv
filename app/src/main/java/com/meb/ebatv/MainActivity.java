package com.meb.ebatv;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Rect;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.view.inputmethod.InputMethodManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import java.io.BufferedReader;
import java.io.InputStreamReader;

public class MainActivity extends Activity {

    private static final String PREFS_NAME = "EbaTVPrefs";
    private static final String KEY_LAST_URL = "last_visited_url";
    private static final String DEFAULT_URL = "https://www.eba.gov.tr/";

    private WebView webView;
    private FrameLayout customViewContainer;
    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private SharedPreferences prefs;
    private String injectedJs = "";

    public class TVInterface {
        @JavascriptInterface
        public void triggerTap(final float x, final float y) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    webView.requestFocus();
                    long downTime = SystemClock.uptimeMillis();
                    long eventTime = SystemClock.uptimeMillis() + 50;
                    MotionEvent down = MotionEvent.obtain(downTime, downTime, MotionEvent.ACTION_DOWN, x, y, 0);
                    MotionEvent up = MotionEvent.obtain(downTime, eventTime, MotionEvent.ACTION_UP, x, y, 0);
                    webView.dispatchTouchEvent(down);
                    webView.dispatchTouchEvent(up);
                    down.recycle();
                    up.recycle();

                    webView.postDelayed(new Runnable() {
                        @Override
                        public void run() {
                            InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                            if (imm != null) {
                                imm.showSoftInput(webView, InputMethodManager.SHOW_FORCED);
                            }
                        }
                    }, 80);
                }
            });
        }

        @JavascriptInterface
        public void showKeyboard() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    webView.requestFocus();
                    InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                    if (imm != null) {
                        imm.showSoftInput(webView, InputMethodManager.SHOW_FORCED);
                    }
                }
            });
        }

        @JavascriptInterface
        public void hideKeyboard() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                    if (imm != null) {
                        imm.hideSoftInputFromWindow(webView.getWindowToken(), 0);
                    }
                }
            });
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Canlı Chromium Hata Ayıklamayı Etkinleştir
        WebView.setWebContentsDebuggingEnabled(true);

        prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);

        FrameLayout rootLayout = new FrameLayout(this);
        rootLayout.setBackgroundColor(Color.parseColor("#121212"));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#121212"));

        customViewContainer = new FrameLayout(this);
        customViewContainer.setVisibility(View.GONE);

        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);

        rootLayout.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        rootLayout.addView(customViewContainer, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        setContentView(rootLayout);

        loadInjectionScript();
        setupWebView();

        String lastUrl = prefs.getString(KEY_LAST_URL, DEFAULT_URL);
        webView.loadUrl(lastUrl);
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setSupportMultipleWindows(false);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        s.setUserAgentString("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 SmartTV/EBA");

        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(webView, true);
        cm.flush();

        webView.addJavascriptInterface(new TVInterface(), "AndroidTV");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (customView != null) {
                    callback.onCustomViewHidden();
                    return;
                }
                customView = view;
                customViewCallback = callback;
                webView.setVisibility(View.GONE);
                customViewContainer.setVisibility(View.VISIBLE);
                customViewContainer.addView(view);
            }

            @Override
            public void onHideCustomView() {
                if (customView == null) return;
                customView.setVisibility(View.GONE);
                customViewContainer.removeView(customView);
                customView = null;
                if (customViewCallback != null) {
                    customViewCallback.onCustomViewHidden();
                }
                customViewContainer.setVisibility(View.GONE);
                webView.setVisibility(View.VISIBLE);
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                view.loadUrl(url);
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                CookieManager.getInstance().flush();

                if (url != null && url.contains("ders.eba.gov.tr") && !url.contains("login") && !url.contains("giris")) {
                    prefs.edit().putString(KEY_LAST_URL, url).apply();
                }

                injectEngine();
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.proceed();
            }
        });

        webView.requestFocus();
    }

    private void injectEngine() {
        if (!injectedJs.isEmpty() && webView != null) {
            webView.evaluateJavascript(injectedJs, null);
        }
    }

    private void loadInjectionScript() {
        try {
            BufferedReader r = new BufferedReader(new InputStreamReader(getAssets().open("tv_remote_engine.js")));
            StringBuilder sb = new StringBuilder();
            String l;
            while ((l = r.readLine()) != null) {
                sb.append(l).append("\n");
            }
            injectedJs = sb.toString();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
    }

    @Override
    protected void onStop() {
        super.onStop();
        CookieManager.getInstance().flush();
    }

    private boolean isKeyboardVisible() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                WindowInsets insets = getWindow().getDecorView().getRootWindowInsets();
                if (insets != null && insets.isVisible(WindowInsets.Type.ime())) {
                    return true;
                }
            }
        } catch (Exception ignored) {}

        try {
            Rect r = new Rect();
            getWindow().getDecorView().getWindowVisibleDisplayFrame(r);
            int heightDiff = getWindow().getDecorView().getHeight() - r.bottom;
            if (heightDiff > 200) {
                return true;
            }
        } catch (Exception ignored) {}

        return false;
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        // Klavyenin açık olduğu anlarda kumanda tuşlarını WebView çalmasın;
        // Kullanıcı kumandayla harfleri/rakamları seçebilsin!
        if (isKeyboardVisible()) {
            return super.dispatchKeyEvent(event);
        }

        if (event.getAction() == KeyEvent.ACTION_DOWN) {
            int keyCode = event.getKeyCode();

            if (keyCode == KeyEvent.KEYCODE_DPAD_UP) {
                webView.evaluateJavascript("if(window.onTvRemoteKey) window.onTvRemoteKey('UP');", null);
                return true;
            } else if (keyCode == KeyEvent.KEYCODE_DPAD_DOWN) {
                webView.evaluateJavascript("if(window.onTvRemoteKey) window.onTvRemoteKey('DOWN');", null);
                return true;
            } else if (keyCode == KeyEvent.KEYCODE_DPAD_LEFT) {
                webView.evaluateJavascript("if(window.onTvRemoteKey) window.onTvRemoteKey('LEFT');", null);
                return true;
            } else if (keyCode == KeyEvent.KEYCODE_DPAD_RIGHT) {
                webView.evaluateJavascript("if(window.onTvRemoteKey) window.onTvRemoteKey('RIGHT');", null);
                return true;
            } else if (keyCode == KeyEvent.KEYCODE_DPAD_CENTER || keyCode == KeyEvent.KEYCODE_ENTER) {
                webView.evaluateJavascript("if(window.onTvRemoteKey) window.onTvRemoteKey('ENTER');", null);
                return true;
            } else if (keyCode == KeyEvent.KEYCODE_BACK) {
                if (customView != null) {
                    ((WebChromeClient) webView.getWebChromeClient()).onHideCustomView();
                    return true;
                }
                if (webView.canGoBack()) {
                    webView.goBack();
                    return true;
                }
            }
        }
        return super.dispatchKeyEvent(event);
    }
}
