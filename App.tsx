import React, { useRef, useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  PermissionsAndroid,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import CookieManager from '@react-native-cookies/cookies';

import ChildrenSelection from './src/components/ChildrenSelection';
import DownloadOptions from './src/components/DownloadOptions';
import DownloadProgress from './src/components/DownloadProgress';
import KidsNoteAPI from './src/services/KidsNoteAPI';

type AppState = 'webview-login' | 'children' | 'options' | 'downloading';

function App(): React.JSX.Element {
  const webViewRef = useRef<WebView>(null);
  const [currentState, setCurrentState] = useState<AppState>('webview-login');
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [downloadConfig, setDownloadConfig] = useState<any>(null);

  useEffect(() => {
    // Request permissions and clear cookies
    const initializeApp = async () => {
      // Request storage permissions
      if (Platform.OS === 'android') {
        try {
          // Check if we need to request All Files Access for Android 11+
          if (Platform.Version >= 30) {
            // For Android 11+, we need All Files Access permission
            Alert.alert(
              '저장소 권한 필요',
              '파일 다운로드를 위해 "모든 파일에 액세스" 권한이 필요합니다. 설정 페이지로 이동하시겠습니까?',
              [
                { text: '취소', style: 'cancel' },
                { 
                  text: '설정으로 이동', 
                  onPress: async () => {
                    try {
                      await Linking.openSettings();
                    } catch (error) {
                      console.error('Failed to open settings:', error);
                    }
                  }
                }
              ]
            );
          } else {
            // For Android 10 and below, use regular permissions
            const permissions = [
              PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
              PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            ];

            const granted = await PermissionsAndroid.requestMultiple(permissions);
            
            console.log('Permission results:', granted);
            
            const allGranted = Object.values(granted).every(
              result => result === PermissionsAndroid.RESULTS.GRANTED
            );
            
            if (!allGranted) {
              Alert.alert(
                '권한 필요',
                '파일 다운로드를 위해 저장소 권한이 필요합니다.',
                [
                  { text: '취소', style: 'cancel' },
                  { 
                    text: '설정으로 이동', 
                    onPress: async () => {
                      try {
                        await Linking.openSettings();
                      } catch (error) {
                        console.error('Failed to open settings:', error);
                      }
                    }
                  }
                ]
              );
            }
          }

          // For Android 13+, also request media permissions
          if (Platform.Version >= 33) {
            const mediaPermissions = [
              PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
              PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO
            ];

            const mediaGranted = await PermissionsAndroid.requestMultiple(mediaPermissions);
            console.log('Media permission results:', mediaGranted);
          }

        } catch (error) {
          console.error('Permission request error:', error);
        }
      }

      // Clear existing cookies
      try {
        await CookieManager.clearAll();
        console.log('Cookies cleared');
      } catch (error) {
        console.error('Failed to clear cookies:', error);
      }
    };

    initializeApp();
  }, []);

  const checkLoginAndExtractCookie = async () => {
    try {
      // Get cookies from WebView
      const cookies = await CookieManager.get('https://www.kidsnote.com');
      console.log('Extracted cookies:', cookies);
      
      if (cookies.sessionid) {
        const sessionId = cookies.sessionid.value;
        console.log('Session ID found:', sessionId);
        
        // Save session to KidsNoteAPI
        await KidsNoteAPI.saveSession(sessionId);
        
        // Switch to native downloader UI
        setCurrentState('children');
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error extracting cookies:', error);
      return false;
    }
  };

  const injectedJavaScript = `
    (function() {
      console.log('Injected script loaded');
      console.log('Current URL:', window.location.href);
      
      // Check if login is successful by monitoring URL changes
      const checkLoginSuccess = () => {
        console.log('Checking login success...');
        console.log('Current pathname:', window.location.pathname);
        console.log('Current URL:', window.location.href);
        
        // More comprehensive login detection
        const isLoggedIn = 
          // URL based detection
          (window.location.pathname.includes('/home') ||
           window.location.pathname.includes('/children') ||
           window.location.pathname.includes('/family') ||
           window.location.pathname.includes('/dashboard') ||
           window.location.href.includes('/home') ||
           window.location.href.includes('/children')) ||
          // Element based detection
          (document.querySelector('[data-testid*="home"]') ||
           document.querySelector('[class*="dashboard"]') ||
           document.querySelector('[class*="family"]') ||
           document.querySelector('[href*="/children"]') ||
           document.querySelector('[href*="/home"]') ||
           document.querySelector('a[href*="/logout"]') ||
           document.querySelector('button[data-testid*="logout"]')) ||
          // Cookie based detection
          (document.cookie.includes('sessionid=') && 
           !window.location.pathname.includes('/login'));
        
        if (isLoggedIn) {
          console.log('Login success detected!');
          window.ReactNativeWebView.postMessage('LOGIN_SUCCESS');
          return true;
        }
        return false;
      };

      // Check immediately after page load
      window.addEventListener('load', () => {
        setTimeout(() => {
          console.log('Page loaded, checking login...');
          checkLoginSuccess();
        }, 1000);
      });

      // Check when DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          setTimeout(() => {
            console.log('DOM ready, checking login...');
            checkLoginSuccess();
          }, 1000);
        });
      } else {
        setTimeout(() => {
          console.log('Document already loaded, checking login...');
          checkLoginSuccess();
        }, 1000);
      }

      // Monitor for navigation changes
      let lastUrl = location.href;
      const observer = new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
          lastUrl = url;
          console.log('URL changed to:', url);
          setTimeout(() => {
            if (checkLoginSuccess()) {
              observer.disconnect();
            }
          }, 1500);
        }
      });
      observer.observe(document, { subtree: true, childList: true });

      // Also check periodically (more frequently)
      const interval = setInterval(() => {
        if (checkLoginSuccess()) {
          clearInterval(interval);
          observer.disconnect();
        }
      }, 2000);

      // Check when user interacts with the page
      document.addEventListener('click', () => {
        setTimeout(() => {
          checkLoginSuccess();
        }, 1000);
      });

      // Check when form is submitted (login form)
      document.addEventListener('submit', (e) => {
        console.log('Form submitted, checking login in 3 seconds...');
        setTimeout(() => {
          checkLoginSuccess();
        }, 3000);
      });


    })();
    true;
  `;

  const handleNavigationStateChange = async (navState: any) => {
    // URL 변경 시마다 로그인 상태 확인
    console.log('Navigation state changed:', navState.url);
    
    // 로그인 페이지가 아닌 곳으로 이동했을 때 쿠키 확인
    if (!navState.url.includes('/login') && 
        !navState.url.includes('/signup') &&
        navState.url.includes('kidsnote.com')) {
      
      console.log('Not on login page, checking for cookies...');
      
      // 약간의 지연 후 쿠키 확인 (페이지 로드 완료 대기)
      setTimeout(async () => {
        const success = await checkLoginAndExtractCookie();
        if (success) {
          console.log('Auto-login detected from navigation!');
        }
      }, 2000);
    }
  };

  const handleWebViewMessage = async (event: any) => {
    const message = event.nativeEvent.data;
    console.log('WebView message received:', message);
    
    if (message === 'LOGIN_SUCCESS') {
      console.log('Login success message received, extracting cookies...');
      const success = await checkLoginAndExtractCookie();
      if (success) {
        console.log('Successfully extracted cookies and switching to native UI');
      }
    }
  };

  const onShouldStartLoadWithRequest = () => {
    return true;
  };

  const handleChildrenSelected = (children: string[]) => {
    setSelectedChildren(children);
    setCurrentState('options');
  };

  const handleStartDownload = (config: any) => {
    setDownloadConfig(config);
    setCurrentState('downloading');
  };

  const handleDownloadComplete = () => {
    setCurrentState('children');
  };

  const handleDownloadCancel = () => {
    setCurrentState('options');
  };

  const renderCurrentScreen = () => {
    switch (currentState) {
      case 'webview-login':
        return (
          <View style={styles.container}>
            <WebView
              ref={webViewRef}
              source={{ uri: 'https://www.kidsnote.com/kr/login' }}
              style={styles.fullWebView}
              onNavigationStateChange={handleNavigationStateChange}
              onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
              onMessage={handleWebViewMessage}
              injectedJavaScript={injectedJavaScript}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              thirdPartyCookiesEnabled={true}
              sharedCookiesEnabled={true}
              startInLoadingState={true}
              scalesPageToFit={true}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={true}
              mixedContentMode="compatibility"
              allowsFullscreenVideo={true}
              allowsBackForwardNavigationGestures={true}
              cacheEnabled={true}
              originWhitelist={['*']}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('WebView error: ', nativeEvent);
              }}
              onHttpError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('WebView HTTP error: ', nativeEvent);
              }}
              userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            />
          </View>
        );
      case 'children':
        return <ChildrenSelection onChildrenSelected={handleChildrenSelected} />;
      case 'options':
        return (
          <DownloadOptions
            selectedChildren={selectedChildren}
            onStartDownload={handleStartDownload}
          />
        );
      case 'downloading':
        return (
          <DownloadProgress
            downloadConfig={downloadConfig}
            onDownloadComplete={handleDownloadComplete}
            onCancel={handleDownloadCancel}
          />
        );
      default:
        return (
          <View style={styles.container}>
            <WebView
              ref={webViewRef}
              source={{ uri: 'https://www.kidsnote.com/kr/login' }}
              style={styles.fullWebView}
              onNavigationStateChange={handleNavigationStateChange}
              onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
              onMessage={handleWebViewMessage}
              injectedJavaScript={injectedJavaScript}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              thirdPartyCookiesEnabled={true}
              sharedCookiesEnabled={true}
              startInLoadingState={true}
              scalesPageToFit={true}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={true}
              mixedContentMode="compatibility"
              allowsFullscreenVideo={true}
              allowsBackForwardNavigationGestures={true}
              cacheEnabled={true}
              originWhitelist={['*']}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('WebView error: ', nativeEvent);
              }}
              onHttpError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('WebView HTTP error: ', nativeEvent);
              }}
              userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            />
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      {renderCurrentScreen()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  fullWebView: {
    flex: 1,
  },
});

export default App;