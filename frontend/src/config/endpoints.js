import { API_BASE_URL } from './api';

export const ENDPOINTS = {
  MODULES:           `${API_BASE_URL}/api/modules`,
  QUIZZES:           `${API_BASE_URL}/api/quizzes`,
  ADMIN_QUIZZES:     `${API_BASE_URL}/api/admin/quizzes`,
  CASES:             `${API_BASE_URL}/api/cases`,
  VOICE_EXAMS:       `${API_BASE_URL}/api/voice-exams`,
  USERS:             `${API_BASE_URL}/api/users`,
  DASHBOARD:         `${API_BASE_URL}/api/dashboard-stats`,
  CLERK_SYNC:        `${API_BASE_URL}/api/auth/clerk-sync`,
  ADMIN_CLAIM:       `${API_BASE_URL}/api/admin/claim`,
  VOICE_EXAM_IMAGES: `${API_BASE_URL}/api/voice-exam-images`,
};
