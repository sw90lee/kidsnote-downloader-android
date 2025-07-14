# 키즈노트 다운로더 Android 앱

기존 Windows용 키즈노트 다운로더를 React Native로 변환한 Android 애플리케이션입니다.

## 기능

- 키즈노트 로그인 및 인증
- 자녀별 데이터 선택
- 이미지 및 동영상 다운로드
- 날짜 필터 기능
- 알림장/앨범 선택 기능
- 실시간 다운로드 진행률 표시

## 설치 요구사항

### 개발 환경
- Node.js (v16 이상)
- React Native CLI
- Android Studio
- JDK 17 이상

### Android 설정
1. Android SDK 설정
2. 에뮬레이터 또는 실제 디바이스 연결
3. USB 디버깅 활성화

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. Android 설정
```bash
# Android 패키지 설치 (필요한 경우)
cd android
./gradlew clean
cd ..
```

### 3. 앱 실행
```bash
# 디버그 모드로 실행
npx react-native run-android

# 또는 Metro 서버 먼저 시작
npx react-native start
# 다른 터미널에서
npx react-native run-android
```

### 4. APK 빌드 (릴리즈)

APK를 빌드하기 전에 다음 사항을 확인하세요:

#### 개발 환경 설정
1. **Java 설치 확인**:
   ```bash
   java -version
   ```
   Java가 설치되지 않은 경우:
   ```bash
   sudo apt update
   sudo apt install openjdk-17-jdk
   ```

2. **Android SDK 설정**:
   - Android Studio를 통해 Android SDK 설치
   - 환경변수 설정:
   ```bash
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

#### APK 빌드
```bash
cd android
./gradlew assembleDebug     # 디버그 APK
./gradlew assembleRelease   # 릴리즈 APK
```

빌드된 APK 파일 위치:
- 디버그: `android/app/build/outputs/apk/debug/app-debug.apk`
- 릴리즈: `android/app/build/outputs/apk/release/app-release.apk`

## 사용법

1. **로그인**: 키즈노트 웹사이트 계정으로 로그인
2. **자녀 선택**: 다운로드할 자녀 선택
3. **옵션 설정**: 
   - 콘텐츠 유형 (이미지, 동영상, 전체)
   - 데이터 소스 (알림장, 앨범)
   - 날짜 범위 설정
4. **다운로드**: 설정한 옵션에 따라 파일 다운로드

## 파일 구조

```
src/
├── components/          # UI 컴포넌트
│   ├── LoginForm.js     # 로그인 폼
│   ├── ChildrenSelection.js  # 자녀 선택
│   ├── DownloadOptions.js    # 다운로드 옵션
│   └── DownloadProgress.js   # 다운로드 진행상황
├── services/            # 비즈니스 로직
│   ├── KidsNoteAPI.js   # 키즈노트 API 연동
│   └── DownloadManager.js    # 다운로드 관리
```

## 권한

앱에서 사용하는 Android 권한:
- `INTERNET`: 네트워크 통신
- `READ_EXTERNAL_STORAGE`: 파일 읽기
- `WRITE_EXTERNAL_STORAGE`: 파일 쓰기
- `MANAGE_EXTERNAL_STORAGE`: 외부 저장소 관리 (Android 11+)
- `READ_MEDIA_IMAGES`: 이미지 접근 (Android 13+)
- `READ_MEDIA_VIDEO`: 동영상 접근 (Android 13+)

## 다운로드 위치

다운로드된 파일은 다음 위치에 저장됩니다:
- Android: `/storage/emulated/0/Download/KidsNote/`

## 문제 해결

### 빌드 오류
1. **Java 설치 확인**: `java -version`
2. **Android SDK 경로 설정**: `ANDROID_HOME` 환경변수 확인
3. **Gradle 권한**: `chmod +x android/gradlew`

### 네트워크 오류
1. **인터넷 연결 확인**
2. **방화벽 설정 확인**
3. **키즈노트 서버 상태 확인**

### 권한 오류
1. **저장소 권한 허용**
2. **Android 설정에서 앱 권한 확인**

## 라이선스

MIT License

## 기여

1. Fork 프로젝트
2. Feature 브랜치 생성
3. 변경사항 커밋
4. Pull Request 생성

## 주의사항

- 이 앱은 교육 목적으로 제작되었습니다
- 키즈노트의 이용약관을 준수하여 사용하세요
- 개인정보 보호에 유의하세요

## 주요 변경사항 (Windows 버전 대비)

1. **플랫폼**: Electron → React Native
2. **UI**: HTML/CSS → React Native 컴포넌트
3. **파일 시스템**: Node.js fs → react-native-fs
4. **네트워킹**: Node.js https → fetch API
5. **저장소**: 로컬 파일 → AsyncStorage + 외부 저장소
6. **권한**: Windows 파일 시스템 → Android 권한 시스템