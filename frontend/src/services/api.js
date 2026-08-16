import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8080',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

// Helper to provide mock fallback data when the real backend is offline
function getMockData(url, method, requestData) {
  if (url.includes('/gov/auth/signin')) {
    const payload = typeof requestData === 'string' ? JSON.parse(requestData || '{}') : requestData || {};
    const username = payload.username || 'rkumar88';
    let role = 'FIELD_OFFICER';
    let fullName = 'Rajesh Kumar';
    
    if (username.toLowerCase().includes('field') || username.toLowerCase().includes('inspect')) {
      role = 'FIELD_OFFICER';
      fullName = 'Rajesh Kumar';
    } else if (username.toLowerCase().includes('finance') || username.toLowerCase().includes('arshad')) {
      role = 'FINANCE_OFFICER';
      fullName = 'Arshad Maideen';
    } else if (username.toLowerCase().includes('admin')) {
      role = 'ADMIN';
      fullName = 'System Administrator';
    } else if (username.toLowerCase().includes('beneficiary') || username.toLowerCase().includes('citizen') || username.toLowerCase().includes('sai')) {
      role = 'BENEFICIARY';
      fullName = 'Sai Kumar';
    }
    
    const user = {
      id: 'GS-8821',
      username,
      role,
      fullName,
      designation: role === 'FIELD_OFFICER' ? 'Field Inspector' : role === 'FINANCE_OFFICER' ? 'Finance Officer' : 'Administrator',
      mobileNo: '+91 98765 43210',
      region: 'North',
      district: 'Lucknow',
      state: 'Uttar Pradesh'
    };
    
    localStorage.setItem('mock_user', JSON.stringify(user));
    return { status: true, message: 'Signed in successfully (Demo)', data: user };
  }
  
  if (url.includes('/gov/auth/profile/get')) {
    const userStr = localStorage.getItem('mock_user');
    const user = userStr ? JSON.parse(userStr) : {
      id: 'GS-8821',
      username: 'rkumar88',
      role: 'FIELD_OFFICER',
      fullName: 'Rajesh Kumar',
      designation: 'Field Inspector',
      mobileNo: '+91 98765 43210',
      region: 'North',
      district: 'Lucknow',
      state: 'Uttar Pradesh'
    };
    return { status: true, data: user };
  }
  
  if (url.includes('/gov/auth/signout')) {
    localStorage.removeItem('mock_user');
    return { status: true, message: 'Logged out' };
  }
  
  if (url.includes('/gov/applications/my') || url.includes('/gov/applications/all') || url.includes('/gov/applications')) {
    return [
      {
        id: 'GS-8821',
        applicationId: 'GS-8821',
        applicant: 'Rajesh Kumar',
        applicantName: 'Rajesh Kumar',
        schemeId: 'pm-awas',
        schemeName: 'National Rural Livelihood Mission (NRLM) Enterprise Subsidy',
        status: 'Pending',
        amount: 50000,
        dob: '14 May 1985',
        aadhaar: 'XXXX-XXXX-4921',
        phone: '+91 98765 43210',
        region: 'North',
        district: 'Lucknow',
        state: 'Uttar Pradesh',
        submittedDate: '12/08/2026',
        createdAt: '2026-08-12',
        remarks: 'Applicant details matched successfully. Pending field report.'
      },
      {
        id: 'SUB-2023-8892-A',
        applicationId: 'SUB-2023-8892-A',
        applicant: 'Rajesh Kumar',
        applicantName: 'Rajesh Kumar',
        schemeId: 'pm-kisan',
        schemeName: 'Agricultural Innovation Grant',
        status: 'Pending',
        amount: 120000,
        dob: '14 May 1985',
        aadhaar: 'XXXX-XXXX-4921',
        phone: '+91 98765 43210',
        region: 'North',
        district: 'Lucknow',
        state: 'Uttar Pradesh',
        submittedDate: '10/08/2026',
        createdAt: '2026-08-10',
        remarks: 'Check checklist and photos for site validation.'
      }
    ];
  }
  
  if (url.includes('/api/v1/disbursement/plan/application/')) {
    return {
      applicationId: 'GS-8821',
      totalAmount: 50000,
      totalStages: 3,
      milestones: [
        { milestoneId: 1, stageNumber: 1, milestoneName: 'Initial Documentation Submitted', amountToRelease: 20000, dueDate: '2026-09-15', completionStatus: 'RELEASED', amountReleased: 20000, releaseDate: '2026-08-12' },
        { milestoneId: 2, stageNumber: 2, milestoneName: 'Ground Verification Completed', amountToRelease: 15000, dueDate: '2026-10-15', completionStatus: 'PENDING' },
        { milestoneId: 3, stageNumber: 3, milestoneName: 'Final Utilization Proof Submitted', amountToRelease: 15000, dueDate: '2026-11-15', completionStatus: 'PENDING' }
      ]
    };
  }
  
  if (url.includes('/api/v1/reports/overdue')) {
    return [
      { milestoneId: 2, beneficiaryName: 'Rajesh Kumar', schemeName: 'NRLM Enterprise Subsidy', milestoneName: 'Ground Verification Completed', dueDate: '2026-08-01', daysOverdue: 14 }
    ];
  }
  
  if (url.includes('/api/v1/disbursement/notifications')) {
    return [
      { id: 1, title: 'Disbursement Complete', message: 'Stage 1 funds released for App ID GS-8821', time: '3 hours ago' }
    ];
  }
  
  if (url.includes('/gov/applications/review') || url.includes('/decide') || url.includes('/update-status') || url.includes('/signup')) {
    return { status: true, message: 'Action processed successfully (Demo Mode)' };
  }
  
  if (url.includes('/api/v1/schemes') || url.includes('/gov/schemes')) {
    return [
      { id: 'pm-kisan', name: 'PM-KISAN (Farmers Income Support)', category: 'AGRICULTURE', budget: 15000000 },
      { id: 'pm-awas', name: 'Pradhan Mantri Awas Yojana', category: 'HOUSING', budget: 25000000 }
    ];
  }
  
  return null;
}

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Detect network errors when the backend is unreachable
    const isNetworkError = error.message === 'Network Error' || !error.response;
    if (isNetworkError) {
      const url = error.config?.url || '';
      const method = error.config?.method || 'get';
      const data = error.config?.data;
      
      const mockData = getMockData(url, method, data);
      if (mockData !== null) {
        console.warn(`[Demo Fallback] Backend offline. Using mock for: ${url}`);
        return Promise.resolve({
          data: mockData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: error.config
        });
      }
    }
    
    const message =
      error.response?.data?.message ||
      error.response?.data ||
      error.message ||
      'An unexpected error occurred.'
    return Promise.reject(new Error(message))
  }
)

export default api
