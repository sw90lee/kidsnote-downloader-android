# Android Studio에서 키즈노트 다운로더 실행 및 디버깅 가이드

## 📋 목차
- [환경 설정](#환경-설정)
- [프로젝트 열기](#프로젝트-열기)
- [앱 실행](#앱-실행)
- [디버깅](#디버깅)
- [테스트](#테스트)
- [빌드](#빌드)
- [문제 해결](#문제-해결)

## 🛠 환경 설정

### 필수 요구사항
- **Node.js**: 18 이상
- **Android Studio**: Arctic Fox 이상
- **JDK**: 17 이상
- **Android SDK**: API 24-35
- **Kotlin**: 2.1.20

### SDK 설정
1. Android Studio > Settings > Android SDK
2. SDK Platforms에서 설치:
   - Android 14.0 (API 35) - Target SDK
   - Android 7.0 (API 24) - Min SDK
3. SDK Tools에서 설치:
   - Android SDK Build-Tools 35.0.0
   - Android NDK 27.1.12297006
   - Android SDK Command-line Tools

## 📂 프로젝트 열기

1. Android Studio 시작
2. **Open an Existing Project** 선택
3. 프로젝트 루트 디렉토리 선택 (`/home/swlee/kidsnote-downloader-android`)
4. Gradle Sync 완료까지 대기

## 🚀 앱 실행

### 방법 1: Android Studio에서 직접 실행
1. AVD Manager에서 에뮬레이터 생성 및 시작
2. 상단 툴바에서 **Run** 버튼 클릭 또는 `Shift + F10`
3. 타겟 디바이스 선택

### 방법 2: 터미널 사용
```bash
# Metro bundler 시작 (별도 터미널)
npm start

# Android 앱 실행 (새 터미널)
npm run android
```

### 방법 3: React Native CLI
```bash
npx react-native run-android
```

## 🐛 디버깅

### JavaScript 디버깅
1. **Chrome DevTools 사용**:
   - 앱에서 디버그 메뉴 열기: `Ctrl + M` (에뮬레이터) 또는 디바이스 흔들기
   - **Debug** 선택
   - Chrome에서 `chrome://inspect` 접속

2. **Flipper 사용**:
   ```bash
   npx @react-native-community/cli doctor
   ```

### Native 디버깅
1. **Android Studio Debugger**:
   - `android/app/src/main/java/com/kidsnotedownloader/MainActivity.kt:16`에 breakpoint 설정
   - Debug 모드로 앱 실행: `Shift + F9`

2. **로그 확인**:
   ```bash
   npx react-native log-android
   ```

### 디버그 빌드 변형
- **Debug**: 개발용, 디버깅 가능
- **Release**: 배포용, 최적화됨

## 🧪 테스트

### 단위 테스트 실행
```bash
# Jest 테스트 실행
npm test

# 커버리지 포함
npm test -- --coverage
```

### 테스트 파일 위치
- `__tests__/App.test.tsx` - 메인 앱 컴포넌트 테스트

### Android 계측 테스트
```bash
cd android
./gradlew connectedAndroidTest
```

## 📦 빌드

### Debug APK 생성
```bash
cd android
./gradlew assembleDebug
```
- 생성 위치: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK 생성
```bash
cd android
./gradlew assembleRelease
```
- 생성 위치: `android/app/build/outputs/apk/release/app-release.apk`

### AAB (Android App Bundle) 생성
```bash
cd android
./gradlew bundleRelease
```

## 🔧 문제 해결

### 자주 발생하는 문제들

#### 1. Metro bundler 오류
```bash
# Metro 캐시 삭제
npx react-native start --reset-cache

# Node modules 재설치
rm -rf node_modules package-lock.json
npm install
```

#### 2. Gradle 동기화 실패
```bash
cd android
./gradlew clean
```

#### 3. 권한 오류 (Linux/macOS)
```bash
chmod +x android/gradlew
```

#### 4. 포트 충돌
```bash
# 8081 포트 사용 중인 프로세스 종료
lsof -ti:8081 | xargs kill -9
```

#### 5. 에뮬레이터 연결 문제
```bash
# ADB 재시작
adb kill-server
adb start-server
```

### 개발 도구

#### Hot Reload 활성화
- 앱에서 `Ctrl + M` → **Enable Hot Reloading**

#### 개발자 메뉴 열기
- **에뮬레이터**: `Ctrl + M`
- **실제 디바이스**: 디바이스 흔들기

#### 성능 모니터링
- **Flipper**: React Native 전용 디버깅 도구
- **Android Studio Profiler**: 메모리, CPU, 네트워크 분석

### 유용한 명령어
```bash
# 연결된 디바이스 확인
adb devices

# 앱 로그 실시간 확인
adb logcat -s ReactNativeJS

# 앱 강제 종료
adb shell am force-stop com.kidsnotedownloader

# 앱 데이터 삭제
adb shell pm clear com.kidsnotedownloader
```

## 📱 배포 전 체크리스트

- [ ] Debug 빌드 정상 작동 확인
- [ ] Release 빌드 생성 및 테스트
- [ ] 모든 단위 테스트 통과
- [ ] ProGuard 설정 확인 (Release 빌드)
- [ ] 네트워크 보안 설정 확인
- [ ] 권한 설정 검토

## 📚 추가 리소스

- [React Native 공식 문서](https://reactnative.dev/docs/getting-started)
- [Android 개발자 가이드](https://developer.android.com/guide)
- [Metro 설정 가이드](https://facebook.github.io/metro/docs/configuration)