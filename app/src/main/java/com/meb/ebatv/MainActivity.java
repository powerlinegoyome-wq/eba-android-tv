package com.meb.ebatv;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.BufferedReader;
import java.io.InputStreamReader;

public class MainActivity extends Activity {

    private WebView webView;
    private String injectedJs = "";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Tam ekran WebView olustur
        webView = new WebView(this);
        setContentView(webView);

        // Kumanda enjeksiyon JS dosyasini oku
        loadInjectionScript();

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false); // Videolarin kumanda ile otomatik oynatilabilmesi icin
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        
        // Masaustu / TV uyumlu User-Agent vererek sitenin tam responsive acilmasini sagla
        settings.setUserAgentString("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SmartTV/EBA");

        // Cerezleri (Cookies) kalici kil
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // Sayfa her yuklendiginde kumanda navigasyon motorunu enjekte et
                if (!injectedJs.isEmpty()) {
                    view.evaluateJavascript(injectedJs, null);
                }
            }
        });

        // EBA Ders veya Ana Portalini Yukle
        webView.loadUrl("https://ders.eba.gov.tr/ders/");
    }

    private void loadInjectionScript() {
        try {
            BufferedReader reader = new BufferedReader(new InputStreamReader(getAssets().open("tv_remote_engine.js")));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }
            injectedJs = sb.toString();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // Kumanda Geri Tusunu Yonetme (Uygulamadan cikmak yerine EBA icinde bir onceki sayfaya git)
    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (webView.canGoBack()) {
                webView.goBack();
                return true;
            }
        }
        return super.onKeyDown(keyCode, event);
    }
}
