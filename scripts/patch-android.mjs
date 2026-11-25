import fs from 'fs';
import path from 'path';

const varsPath = path.join('android', 'variables.gradle');
if (fs.existsSync(varsPath)) {
  let vars = fs.readFileSync(varsPath, 'utf8');
  vars = vars.replace(/compileSdkVersion\s*=\s*\d+/g, 'compileSdkVersion = 36');
  vars = vars.replace(/targetSdkVersion\s*=\s*\d+/g, 'targetSdkVersion = 36');
  vars = vars.replace(/minSdkVersion\s*=\s*\d+/g, 'minSdkVersion = 29');
  fs.writeFileSync(varsPath, vars);
}

const appGradlePath = path.join('android', 'app', 'build.gradle');
if (fs.existsSync(appGradlePath)) {
  let gradle = fs.readFileSync(appGradlePath, 'utf8');
  if (!gradle.includes('android15Plus')) {
    const flavorBlock = `
    flavorDimensions "androidTier"
    productFlavors {
        android15Plus {
            dimension "androidTier"
            applicationIdSuffix ".a15"
            minSdk 35
            targetSdk 36
            versionNameSuffix "-android15plus"
        }
        android10Plus {
            dimension "androidTier"
            applicationIdSuffix ".a10"
            minSdk 29
            targetSdk 34
            versionNameSuffix "-android10plus"
        }
    }
    buildTypes {`;
    gradle = gradle.replace(/\bbuildTypes\s*\{/, flavorBlock);
    fs.writeFileSync(appGradlePath, gradle);
  }
}

const manifestPath = path.join('android', 'app', 'src', 'main', 'AndroidManifest.xml');
if (fs.existsSync(manifestPath)) {
  let manifest = fs.readFileSync(manifestPath, 'utf8');
  if (!manifest.includes('android:hardwareAccelerated')) {
    manifest = manifest.replace(
      '<application',
      '<application android:hardwareAccelerated="true" android:largeHeap="true" android:usesCleartextTraffic="true"'
    );
  }
  const perms = [
    'android.permission.WAKE_LOCK',
    'android.permission.FOREGROUND_SERVICE',
    'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
    'android.permission.RECORD_AUDIO',
    'android.permission.MODIFY_AUDIO_SETTINGS',
  ];
  for (const p of perms) {
    if (!manifest.includes(p)) {
      manifest = manifest.replace(
        '<application',
        `<uses-permission android:name="${p}" />\n    <application`
      );
    }
  }
  fs.writeFileSync(manifestPath, manifest);
}

const mainActivityPath = path.join(
  'android',
  'app',
  'src',
  'main',
  'java',
  'com',
  'aurasound',
  'music',
  'MainActivity.java'
);
fs.mkdirSync(path.dirname(mainActivityPath), { recursive: true });
fs.writeFileSync(
  mainActivityPath,
  `package com.aurasound.music;

import android.os.Build;
import android.os.Bundle;
import android.view.Display;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        enableHighRefreshRate();
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView wv = this.bridge.getWebView();
            wv.setLayerType(View.LAYER_TYPE_HARDWARE, null);
            WebSettings ws = wv.getSettings();
            ws.setMediaPlaybackRequiresUserGesture(false);
        }
    }

    private void enableHighRefreshRate() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                Display display = getWindowManager().getDefaultDisplay();
                Display.Mode[] modes = display.getSupportedModes();
                Display.Mode best = display.getMode();
                for (Display.Mode m : modes) {
                    if (m.getRefreshRate() > best.getRefreshRate()) {
                        best = m;
                    }
                }
                WindowManager.LayoutParams params = getWindow().getAttributes();
                params.preferredDisplayModeId = best.getModeId();
                getWindow().setAttributes(params);
            } catch (Exception ignored) {
            }
        }
    }
}
`
);

console.log('Android patch 120Hz, mic permission & dual flavors selesai');
