import React, { useRef, useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview';
import CookieManager from '@react-native-cookies/cookies';

function App(): React.JSX.Element {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('https://www.kidsnote.com');

  useEffect(() => {
    // Clear existing cookies and enable cookie management
    CookieManager.clearAll()
      .then(() => {
        console.log('Cookies cleared');
      })
      .catch((error) => {
        console.error('Failed to clear cookies:', error);
      });
  }, []);

  const injectedJavaScript = `
    (function() {
      // Enable cookie sharing between WebView and native
      window.ReactNativeWebView = window.ReactNativeWebView || {};
      
      // KidsNote downloader functionality based on origin.js
      const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      
      // Download image function
      const downloadImage = async (url, filename) => {
        try {
          const response = await fetch(url, {
            method: 'GET',
            credentials: 'include' // Include cookies
          });
          const blob = await response.blob();
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
          console.log('Downloaded:', filename);
        } catch (error) {
          console.log('Download error:', error);
        }
      };

      // Process entries function
      const processEntries = async (parsedData, type, urltype) => {
        let downloadCount = 0;
        for (const entry of parsedData.results) {
          let formattedDate;
          let comment;

          if (urltype === '1') {
            const { date_written, class_name, child_name, content, weather, attached_images, attached_video } = entry;
            formattedDate = date_written ? date_written.replace(/-/g, '년') + '일' : 'unknown_date';
            comment = \`\${formattedDate} (\${weather || 'Unknown'})\\n\${content || ''}\`;

            if ((type === '1' || type === 'all') && attached_images && attached_images.length > 0) {
              for (const image of attached_images) {
                const extension = image.original_file_name.split('.').pop();
                const finalFilename = \`\${formattedDate}-\${class_name}-\${child_name}-\${image.id}.\${extension}\`;
                await downloadImage(image.original, finalFilename);
                downloadCount++;
                await sleep(100);
              }
            }

            if ((type === '2' || type === 'all') && attached_video) {
              const extension = attached_video.original_file_name.split('.').pop();
              const finalFilename = \`\${formattedDate}-\${class_name}-\${child_name}-\${attached_video.id}.\${extension}\`;
              await downloadImage(attached_video.high, finalFilename);
              downloadCount++;
              await sleep(100);
            }
          } else if (urltype === '2') {
            const { modified, child_name, attached_images, attached_video } = entry;
            formattedDate = modified ? modified.split('T')[0].replace(/-/g, '년') + '일' : 'unknown_date';
            comment = \`Album Upload (\${formattedDate})\`;

            if ((type === '1' || type === 'all') && attached_images && attached_images.length > 0) {
              for (const image of attached_images) {
                const extension = image.original_file_name.split('.').pop();
                const finalFilename = \`\${formattedDate}-\${child_name}-\${image.id}.\${extension}\`;
                await downloadImage(image.original, finalFilename);
                downloadCount++;
                await sleep(100);
              }
            }

            if ((type === '2' || type === 'all') && attached_video) {
              const extension = attached_video.original_file_name.split('.').pop();
              const finalFilename = \`\${formattedDate}-\${child_name}-\${attached_video.id}.\${extension}\`;
              await downloadImage(attached_video.high, finalFilename);
              downloadCount++;
              await sleep(100);
            }
          }
        }
        return downloadCount;
      };

      // Get JSON data
      const getJson = async (id, type, size, index, urltype) => {
        try {
          let downloadSize = size === 'all' ? 9999 * index : size;
          const url = \`/api/v1_2/children/\${id}/\${urltype === '1' ? 'reports' : 'albums'}/?page_size=\${downloadSize}&tz=Asia%2FSeoul&child=\${id}\`;
          
          const response = await fetch(url, {
            method: 'GET',
            credentials: 'include', // Include cookies
            headers: {
              'User-Agent': 'Mozilla/5.0',
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });

          if (response.status === 401) {
            alert("세션 만료! 로그인 후 진행해주세요.");
            return 0;
          } else if (response.status > 400) {
            alert("현재 키즈노트 서버가 좋지 않습니다.");
            return 0;
          }

          const parsedData = await response.json();
          let totalDownloaded = 0;

          if (size === 'all' && parsedData.next !== null) {
            console.log("최대 데이터 추출 중...");
            totalDownloaded += await processEntries(parsedData, type, urltype);
            totalDownloaded += await getJson(id, type, size, index + 1, urltype);
          } else {
            totalDownloaded = await processEntries(parsedData, type, urltype);
          }
          
          return totalDownloaded;
        } catch (err) {
          console.error(\`Request error: \${err.message}\`);
          alert(\`오류 발생: \${err.message}\`);
          return 0;
        }
      };

      // Get children data
      const getChildrenData = async () => {
        try {
          const response = await fetch('/api/v1/me/info', {
            method: 'GET',
            credentials: 'include', // Include cookies
            headers: {
              'User-Agent': 'Mozilla/5.0',
              'Accept': 'application/json'
            }
          });

          if (response.status === 401) {
            alert("세션 만료! 로그인 후 진행해주세요.");
            return [];
          } else if (response.status > 400) {
            alert("현재 키즈노트 서버가 좋지 않습니다.");
            return [];
          }

          const data = await response.json();
          console.log('Children data:', data);
          return data.children || [];
        } catch (err) {
          console.error(\`Request error: \${err.message}\`);
          return [];
        }
      };

      // Add download interface
      const addDownloadInterface = () => {
        if (document.getElementById('kidsnote-downloader')) return;

        const downloadDiv = document.createElement('div');
        downloadDiv.id = 'kidsnote-downloader';
        downloadDiv.style.cssText = \`
          position: fixed;
          top: 10px;
          right: 10px;
          background: #fff;
          border: 2px solid #007bff;
          border-radius: 8px;
          padding: 15px;
          z-index: 10000;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          max-width: 300px;
          font-family: Arial, sans-serif;
        \`;

        downloadDiv.innerHTML = \`
          <h3 style="margin: 0 0 10px 0; color: #007bff;">KidsNote Downloader</h3>
          <button id="start-download" style="
            width: 100%;
            padding: 10px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-bottom: 5px;
            font-size: 14px;
          ">다운로드 시작</button>
          <button id="close-downloader" style="
            width: 100%;
            padding: 5px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          ">닫기</button>
          <div id="download-status" style="margin-top: 10px; font-size: 12px; color: #666;"></div>
        \`;

        document.body.appendChild(downloadDiv);

        document.getElementById('start-download').onclick = async () => {
          const statusDiv = document.getElementById('download-status');
          statusDiv.textContent = '자녀 정보를 가져오는 중...';
          
          const children = await getChildrenData();
          if (children.length === 0) {
            alert('키즈노트에 등록된 자녀가 없거나 로그인이 필요합니다.');
            statusDiv.textContent = '';
            return;
          }

          const type = prompt('다운로드 종류를 선택하세요:\\n1: 사진\\n2: 동영상\\n3 또는 빈값: 모두', '3') || 'all';
          const urltype = prompt('URL 종류를 선택하세요:\\n1: reports\\n2: albums', '1');
          const childIndex = prompt(\`다운받으실 자녀를 선택해주세요 (모두: all):\\n\${children.map((c, i) => \`\${i+1}: \${c.name}\`).join('\\n')}\`, 'all');
          const size = prompt('다운받으실 페이지 수를 입력해주세요(숫자입력), 전체: all', 'all');

          const selectedChildren = childIndex === 'all' ? children : [children[parseInt(childIndex) - 1]];
          
          if (!selectedChildren || selectedChildren.length === 0) {
            alert('올바른 자녀를 선택해주세요.');
            statusDiv.textContent = '';
            return;
          }

          let totalDownloaded = 0;
          for (const child of selectedChildren) {
            statusDiv.textContent = \`\${child.name} 데이터 추출 중...\`;
            console.log(\`\${child.name} 데이터 추출 중...\`);
            const downloaded = await getJson(child.id, type, size, 1, urltype);
            totalDownloaded += downloaded;
          }
          
          statusDiv.textContent = \`다운로드 완료! 총 \${totalDownloaded}개 파일\`;
          alert(\`다운로드 완료! 총 \${totalDownloaded}개 파일이 다운로드되었습니다.\`);
        };

        document.getElementById('close-downloader').onclick = () => {
          downloadDiv.remove();
        };
      };

      // Check if on KidsNote and add interface
      if (window.location.hostname === 'www.kidsnote.com') {
        // Wait for login to complete before showing downloader
        const checkLogin = () => {
          // Check if we're on a page that indicates login success
          if (window.location.pathname.includes('/home') || 
              window.location.pathname.includes('/children') ||
              document.querySelector('[class*="child"]') ||
              document.querySelector('[class*="dashboard"]')) {
            setTimeout(addDownloadInterface, 1000);
          } else {
            // Check again after 2 seconds if not logged in yet
            setTimeout(checkLogin, 2000);
          }
        };
        
        setTimeout(checkLogin, 2000);
      }

      // Listen for navigation changes
      let lastUrl = location.href;
      new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
          lastUrl = url;
          if (window.location.hostname === 'www.kidsnote.com') {
            setTimeout(() => {
              if (window.location.pathname.includes('/home') || 
                  window.location.pathname.includes('/children') ||
                  document.querySelector('[class*="child"]') ||
                  document.querySelector('[class*="dashboard"]')) {
                addDownloadInterface();
              }
            }, 1000);
          }
        }
      }).observe(document, { subtree: true, childList: true });

    })();
    true;
  `;

  const handleNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
    setCurrentUrl(navState.url);
  };

  const onShouldStartLoadWithRequest = (request: any) => {
    // Allow all requests for KidsNote domain
    return true;
  };

  const goBack = () => {
    if (webViewRef.current && canGoBack) {
      webViewRef.current.goBack();
    }
  };

  const reload = () => {
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const goHome = () => {
    if (webViewRef.current) {
      webViewRef.current.loadRequest({ uri: 'https://www.kidsnote.com' });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      <View style={styles.toolbar}>
        <TouchableOpacity 
          style={[styles.toolbarButton, !canGoBack && styles.disabledButton]} 
          onPress={goBack}
          disabled={!canGoBack}
        >
          <Text style={styles.toolbarButtonText}>←</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.toolbarButton} onPress={reload}>
          <Text style={styles.toolbarButtonText}>⟳</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.toolbarButton} onPress={goHome}>
          <Text style={styles.toolbarButtonText}>🏠</Text>
        </TouchableOpacity>
        
        <Text style={styles.urlText} numberOfLines={1}>
          {currentUrl}
        </Text>
      </View>

      <WebView
        ref={webViewRef}
        source={{ uri: 'https://www.kidsnote.com' }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        injectedJavaScript={injectedJavaScript}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="compatibility"
        onMessage={(event) => {
          console.log('WebView message:', event.nativeEvent.data);
        }}
        userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  toolbarButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: '#007bff',
    borderRadius: 4,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  toolbarButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  urlText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  webview: {
    flex: 1,
  },
});

export default App;