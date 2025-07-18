# 🔄 KidsNote Downloader Android - 주요 변경사항

## 📋 Issue Summary
React Native 기반 KidsNote 다운로더를 WebView 로그인 방식으로 전환하고 저장소 설정 기능을 추가했습니다.

## 🚀 주요 변경사항

### 1. **WebView 로그인 시스템 구현** 
- **목적**: 안드로이드에서 쿠키 세션 관리 문제 해결
- **변경**: 기존 네이티브 로그인 → WebView 로그인 후 네이티브 UI 전환

#### 🔧 변경된 파일들:
- **`App.tsx`** - 완전 재구성
  - WebView 기반 로그인 화면 추가
  - 자동 로그인 감지 시스템 구현
  - 쿠키 추출 및 네이티브 전환 로직
  - 다중 감지 메커니즘 (URL변경, DOM요소, 주기적체크, 폼제출감지)

- **`src/services/KidsNoteAPI.js`**
  - `saveSession()` 함수 추가
  - `getDownloadPath()`, `setDownloadPath()` 함수 추가
  - `downloadFile()` 사용자 정의 경로 지원

### 2. **저장소 설정 기능 추가** 
- **목적**: 사용자가 다운로드 경로를 자유롭게 설정
- **기능**: 폴더 선택, 경로 검증, 자동 생성

#### 📁 새로운 파일들:
- **`src/components/StorageSettings.tsx`** (신규)
  - 저장 경로 설정 UI
  - 프리셋 경로 빠른 선택
  - 사용자 정의 경로 입력
  - 폴더 선택기 연동
  - 경로 검증 및 자동 생성

- **`src/components/DownloadOptions.js`** (수정)
  - 저장소 설정 버튼 추가
  - 현재 경로 표시
  - Modal 저장소 설정 연동

### 3. **권한 시스템 강화** 
- **목적**: Android 13+ 대응 및 저장소 접근 권한 확보

#### 🛡️ 권한 관련 변경:
- **`android/app/src/main/AndroidManifest.xml`**
  ```xml
  + <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
  + <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
  + <uses-permission android:name="android.permission.MANAGE_EXTERNAL_STORAGE" />
  + <uses-permission android:name="android.permission.ACCESS_MEDIA_LOCATION" />
  ```

- **`App.tsx`** - 런타임 권한 요청 추가
  - Android 13+ 미디어 권한 대응
  - 자동 권한 요청 및 안내

### 4. **의존성 추가** 
- **`package.json`** 새로운 라이브러리:
  ```json
  + "react-native-webview": "latest"
  + "@react-native-documents/picker": "latest"
  ```

## 🔄 플로우 변경사항

### 🔄 Before (기존):
```
앱 시작 → 네이티브 로그인 폼 → 자녀 선택 → 다운로드
```

### ✨ After (변경후):
```
앱 시작 → WebView 로그인 → 쿠키 추출 → 네이티브 UI 전환 → 자녀 선택 → 저장소 설정 → 다운로드
```

## 🎯 핵심 기능

### 🔐 자동 로그인 감지
- URL 변경 감지
- DOM 요소 확인 (로그아웃 버튼, 홈 링크 등)
- 쿠키 존재 확인
- 폼 제출 감지
- 주기적 체크 (2초마다)

### 📁 저장소 설정
- **기본 경로들**:
  - `Download/KidsNote` (기본)
  - `Pictures/KidsNote` (추천)
  - `DCIM/KidsNote`
  - `Documents/KidsNote`
- **사용자 정의 경로** 지원
- **폴더 선택기** 연동
- **자동 폴더 생성**
- **쓰기 권한 검증**

### 🛠️ 수동 제어
- 툴바의 녹색 체크(✓) 버튼으로 수동 쿠키 추출
- 빨간색 "Test Login Detection" 버튼으로 디버깅

## 🐛 해결된 문제들

1. **쿠키 세션 관리 문제** ✅
   - WebView + CookieManager 조합으로 해결
   - 안드로이드 쿠키 공유 문제 해결

2. **모바일 리다이렉트 문제** ✅
   - 데스크톱 User-Agent 사용으로 해결
   - 앱 다운로드 유도 페이지 우회

3. **저장소 권한 문제** ✅
   - Android 13+ 권한 대응
   - 런타임 권한 요청 자동화

4. **오디오 에러 문제** ✅
   - `mediaPlaybackRequiresUserAction={true}` 설정
   - 자동 오디오 재생 비활성화

## 🚨 알려진 이슈

1. **CORS 에러** - KidsNote 웹사이트 CSS 리소스 문제 (기능에는 영향 없음)
2. **PCM 오디오 에러** - 에뮬레이터 오디오 드라이버 문제 (기능에는 영향 없음)

## 🧪 테스트 방법

1. **권한 확인**: 앱 시작 시 저장소 권한 팝업 확인
2. **로그인 테스트**: WebView에서 KidsNote 로그인
3. **자동 전환**: 로그인 후 자동으로 네이티브 UI로 전환 확인
4. **저장소 설정**: 다운로드 옵션에서 저장 경로 설정 확인
5. **다운로드 테스트**: 설정한 경로에 파일 다운로드 확인

## 📝 커밋 히스토리

```
b98a977 저장소 권한 설정 및 저장소 변경관련 로직추가
fdbeb42 쿠키세션 에러 수정 TEST  
1b2b549 webview 로그인 관련 수정
4b8190d 로그인페이지 이동 수정
d50015b webview스타일로 변경
1b0295b react-native-webview로 변경
```

## 🎯 다음 단계

- [ ] 다운로드 진행률 UI 개선
- [ ] 에러 핸들링 강화
- [ ] 백그라운드 다운로드 지원
- [ ] 다운로드 이력 관리

---

**💡 개발자 노트**: 이 변경으로 안드로이드에서의 쿠키 세션 관리 문제가 완전히 해결되었고, 사용자 경험이 크게 개선되었습니다.