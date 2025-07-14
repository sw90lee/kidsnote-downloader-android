# 키즈노트 다운로더 (KidsNote Downloader)

키즈노트에서 아이들의 사진과 영상을 자동으로 다운로드하는 React Native 앱입니다.

## 기능

- 키즈노트 계정으로 로그인
- 여러 자녀 중 선택하여 다운로드
- 날짜 범위 지정 다운로드
- 사진 및 영상 자동 다운로드
- 다운로드 진행 상황 실시간 표시

## 시작하기

> **주의**: 진행하기 전에 [환경 설정 가이드](https://reactnative.dev/docs/set-up-your-environment)를 완료했는지 확인하세요.

### 1단계: Metro 시작

먼저 React Native용 JavaScript 빌드 도구인 **Metro**를 실행해야 합니다.

React Native 프로젝트 루트에서 다음 명령어를 실행하여 Metro 개발 서버를 시작하세요:

```sh
# npm 사용
npm start

# 또는 Yarn 사용
yarn start
```

### 2단계: 앱 빌드 및 실행

Metro가 실행 중인 상태에서 React Native 프로젝트 루트에서 새 터미널 창/탭을 열고 다음 명령어 중 하나를 사용하여 Android 또는 iOS 앱을 빌드하고 실행하세요:

#### Android

```sh
# npm 사용
npm run android

# 또는 Yarn 사용
yarn android
```

#### iOS

iOS의 경우 CocoaPods 종속성을 설치해야 합니다 (첫 클론 시 또는 네이티브 종속성 업데이트 후에만 실행하면 됩니다).

새 프로젝트를 처음 생성할 때 Ruby bundler를 실행하여 CocoaPods 자체를 설치하세요:

```sh
bundle install
```

그리고 네이티브 종속성을 업데이트할 때마다 다음을 실행하세요:

```sh
bundle exec pod install
```

자세한 정보는 [CocoaPods 시작 가이드](https://guides.cocoapods.org/using/getting-started.html)를 참조하세요.

```sh
# npm 사용
npm run ios

# 또는 Yarn 사용
yarn ios
```

모든 것이 올바르게 설정되었다면 Android 에뮬레이터, iOS 시뮬레이터 또는 연결된 장치에서 새 앱이 실행되는 것을 볼 수 있습니다.

Android Studio 또는 Xcode에서 직접 앱을 빌드할 수도 있습니다.

### 3단계: 앱 수정

앱을 성공적으로 실행했으니 이제 변경해 봅시다!

원하는 텍스트 에디터에서 `App.tsx`를 열고 일부 변경 사항을 만드세요. 저장하면 앱이 자동으로 업데이트되어 이러한 변경 사항이 반영됩니다. 이는 [Fast Refresh](https://reactnative.dev/docs/fast-refresh)에 의해 구동됩니다.

앱 상태를 재설정하는 등 강제로 다시 로드하고 싶을 때는 전체 다시 로드를 수행할 수 있습니다:

- **Android**: <kbd>R</kbd> 키를 두 번 누르거나 **개발자 메뉴**에서 **"Reload"**를 선택하세요. 개발자 메뉴는 <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) 또는 <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS)로 접근할 수 있습니다.
- **iOS**: iOS 시뮬레이터에서 <kbd>R</kbd>을 누르세요.

## 사용 방법

1. 앱을 실행하면 키즈노트 로그인 화면이 나타납니다
2. 키즈노트 계정 정보를 입력하여 로그인하세요
3. 다운로드할 자녀를 선택하세요
4. 다운로드 옵션을 설정하세요 (날짜 범위, 파일 형식 등)
5. 다운로드를 시작하고 진행 상황을 확인하세요

## 문제 해결

위 단계를 수행하는 데 문제가 있다면 [문제 해결](https://reactnative.dev/docs/troubleshooting) 페이지를 참조하세요.

## 더 알아보기

React Native에 대해 더 자세히 알아보려면 다음 리소스를 참조하세요:

- [React Native 웹사이트](https://reactnative.dev) - React Native에 대해 더 알아보기
- [시작하기](https://reactnative.dev/docs/environment-setup) - React Native **개요** 및 환경 설정 방법
- [기본 사항 학습](https://reactnative.dev/docs/getting-started) - React Native **기본 사항**에 대한 **가이드 투어**
- [블로그](https://reactnative.dev/blog) - 최신 공식 React Native **블로그** 포스트 읽기
- [`@facebook/react-native`](https://github.com/facebook/react-native) - React Native용 오픈 소스 GitHub **저장소**