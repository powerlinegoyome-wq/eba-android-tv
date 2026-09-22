package com.meb.ebatv;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.net.http.SslError;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
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

    private WebView webView;
    private FrameLayout customViewContainer;
    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private String injectedJs = "";

    public class TVInterface {
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

        // Ekrani her zaman acik tut (Ders izlerken ekran kararmasin)
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        FrameLayout rootLayout = new FrameLayout(this);
        webView = new WebView(this);
        customViewContainer = new FrameLayout(this);
        customViewContainer.setVisibility(View.GONE);

        // TV Klavyesi icin odaklanabilirlik zorunlu
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);

        rootLayout.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        rootLayout.addView(customViewContainer, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        setContentView(rootLayout);

        loadInjectionScript();
        setupWebView();

        // En son ve modern EBA ana sayfasi
        webView.loadUrl("https://www.eba.gov.tr/");
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

        // Modern Chrome Masaüstü / TV User Agent
        s.setUserAgentString("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 SmartTV/EBA");

        // Cerezleri kalici kil (e-Devlet ve EBA arasi gecisler icin)
        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(webView, true);

        // JavaScript Koprusunu Ekle (Sanal Klavye Kontrolu Icin)
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
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_DOWN) {
            int keyCode = event.getKeyCode();

            if (keyCode == KeyEvent.KEYCODE_BACK) {
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
