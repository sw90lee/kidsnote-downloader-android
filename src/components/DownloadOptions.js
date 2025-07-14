import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import DatePicker from 'react-native-date-picker';

const DownloadOptions = ({ selectedChildren, onStartDownload }) => {
  const [contentType, setContentType] = useState('all'); // all, 1(images), 2(videos)
  const [sourceType, setSourceType] = useState('1'); // 1(reports), 2(albums)
  const [useAllData, setUseAllData] = useState(true);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const contentTypes = [
    { id: 'all', label: '이미지 + 동영상' },
    { id: '1', label: '이미지만' },
    { id: '2', label: '동영상만' },
  ];

  const sourceTypes = [
    { id: '1', label: '알림장' },
    { id: '2', label: '앨범' },
  ];

  const handleStartDownload = () => {
    const downloadConfig = {
      selectedChildren,
      contentType,
      sourceType,
      useAllData,
      startDate: useAllData ? null : startDate.toISOString().split('T')[0],
      endDate: useAllData ? null : endDate.toISOString().split('T')[0],
    };

    // 날짜 유효성 검사
    if (!useAllData && startDate > endDate) {
      Alert.alert('오류', '시작 날짜가 종료 날짜보다 늦습니다.');
      return;
    }

    Alert.alert(
      '다운로드 확인',
      `다음 설정으로 다운로드를 시작하시겠습니까?\n\n` +
      `자녀: ${selectedChildren.length}명\n` +
      `콘텐츠: ${contentTypes.find(t => t.id === contentType)?.label}\n` +
      `소스: ${sourceTypes.find(t => t.id === sourceType)?.label}\n` +
      `범위: ${useAllData ? '전체' : `${startDate.toLocaleDateString()} ~ ${endDate.toLocaleDateString()}`}`,
      [
        { text: '취소', style: 'cancel' },
        { text: '시작', onPress: () => onStartDownload(downloadConfig) }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>다운로드 설정</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>다운로드할 콘텐츠 유형</Text>
        {contentTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.optionItem,
              contentType === type.id && styles.selectedOption
            ]}
            onPress={() => setContentType(type.id)}
          >
            <Text style={[
              styles.optionText,
              contentType === type.id && styles.selectedOptionText
            ]}>
              {type.label}
            </Text>
            <View style={[
              styles.radio,
              contentType === type.id && styles.selectedRadio
            ]}>
              {contentType === type.id && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>데이터 소스</Text>
        {sourceTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.optionItem,
              sourceType === type.id && styles.selectedOption
            ]}
            onPress={() => setSourceType(type.id)}
          >
            <Text style={[
              styles.optionText,
              sourceType === type.id && styles.selectedOptionText
            ]}>
              {type.label}
            </Text>
            <View style={[
              styles.radio,
              sourceType === type.id && styles.selectedRadio
            ]}>
              {sourceType === type.id && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.switchContainer}>
          <Text style={styles.sectionTitle}>전체 데이터 다운로드</Text>
          <Switch
            value={useAllData}
            onValueChange={setUseAllData}
            trackColor={{ false: '#ddd', true: '#007AFF' }}
            thumbColor={useAllData ? '#ffffff' : '#f4f3f4'}
          />
        </View>
        
        {!useAllData && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateLabel}>기간 설정</Text>
            
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                시작일: {startDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                종료일: {endDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.downloadButton}
        onPress={handleStartDownload}
      >
        <Text style={styles.downloadButtonText}>다운로드 시작</Text>
      </TouchableOpacity>

      <DatePicker
        modal
        open={showStartDatePicker}
        date={startDate}
        mode="date"
        onConfirm={(date) => {
          setShowStartDatePicker(false);
          setStartDate(date);
        }}
        onCancel={() => {
          setShowStartDatePicker(false);
        }}
        title="시작 날짜 선택"
        confirmText="확인"
        cancelText="취소"
      />

      <DatePicker
        modal
        open={showEndDatePicker}
        date={endDate}
        mode="date"
        onConfirm={(date) => {
          setShowEndDatePicker(false);
          setEndDate(date);
        }}
        onCancel={() => {
          setShowEndDatePicker(false);
        }}
        title="종료 날짜 선택"
        confirmText="확인"
        cancelText="취소"
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedOption: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOptionText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRadio: {
    borderColor: '#007AFF',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  dateContainer: {
    paddingTop: 10,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  dateButton: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  downloadButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  downloadButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default DownloadOptions;