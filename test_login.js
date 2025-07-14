import KidsNoteAPI from './src/services/KidsNoteAPI.js';

const testLogin = async () => {
  console.log('=== 키즈노트 로그인 테스트 시작 ===');
  
  // 테스트 계정 정보 (실제 계정 정보로 변경 필요)
  const username = 'sw90lee';
  const password = 'dhksauddA1!';
  
  try {
    const result = await KidsNoteAPI.login(username, password);
    
    if (result.success) {
      console.log('✅ 로그인 성공!');
      console.log('세션 ID:', result.sessionID);
      
      // 자녀 정보 가져오기 테스트
      console.log('\n=== 자녀 정보 가져오기 테스트 ===');
      const childrenResult = await KidsNoteAPI.getChildren();
      
      if (childrenResult.success) {
        console.log('✅ 자녀 정보 가져오기 성공!');
        console.log('자녀 목록:', childrenResult.children);
      } else {
        console.log('❌ 자녀 정보 가져오기 실패:', childrenResult.error);
      }
      
      // 로그아웃 테스트
      console.log('\n=== 로그아웃 테스트 ===');
      await KidsNoteAPI.logout();
      console.log('✅ 로그아웃 완료');
      
    } else {
      console.log('❌ 로그인 실패:', result.error);
    }
  } catch (error) {
    console.error('💥 테스트 중 오류 발생:', error);
  }
};

// 테스트 실행
testLogin();