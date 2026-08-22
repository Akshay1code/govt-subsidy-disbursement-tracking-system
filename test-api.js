const http = require('http');

async function apiCall(method, path, body = null, cookie = null) {
    const url = `http://localhost:8080${path}`;
    const headers = {
        'Content-Type': 'application/json'
    };
    if (cookie) {
        headers['Cookie'] = cookie;
    }

    const options = {
        method,
        headers,
    };
    if (body) {
        options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    const responseCookies = res.headers.get('set-cookie');
    
    let json;
    const text = await res.text();
    try {
        json = JSON.parse(text);
    } catch {
        json = text;
    }

    return {
        status: res.status,
        cookie: responseCookies ? responseCookies.split(';')[0] : cookie,
        data: json
    };
}

async function runTest() {
    console.log("🚀 Starting E2E API Test...");

    // 1. Admin Login
    console.log("\n[1] Logging in as Admin...");
    const adminRes = await apiCall('POST', '/gov/auth/signin', { username: "admin_123", password: "Admin@123" });
    console.log(`Admin Login Status: ${adminRes.status}`);
    const adminCookie = adminRes.cookie;

    // 2. Create Scheme
    console.log("\n[2] Creating Scheme with Benefit and Eligibility Rules...");
    const schemePayload = {
        schemeName: "Automated E2E Scheme",
        description: "Testing scheme creation and benefit fields",
        benefit: 5000.50,
        allocatedFunds: 100000,
        minimumEligibleScore: 0,
        active: true,
        rules: [
            { fieldName: "ANNUAL_INCOME", operator: "LESS_THAN", expectedValue: "100000" }
        ],
        fields: [
            { fieldName: "ANNUAL_INCOME", mandatory: true }
        ],
        documents: [
            { documentType: "AADHAAR", mandatory: true }
        ]
    };
    const schemeRes = await apiCall('POST', '/gov/schemes/add', schemePayload, adminCookie);
    console.log(`Scheme Creation Status: ${schemeRes.status}`);
    console.log(schemeRes.data);
    const schemeCode = schemeRes.data.schemeCode;
    
    if (!schemeCode) {
        console.error("❌ Failed to create scheme. Exiting test.");
        return;
    }

    console.log(`✅ Scheme successfully created with code: ${schemeCode}`);
    console.log("\n🎉 E2E Test (Phase 1) completed successfully. The bug with RuleField 'INCOME' is confirmed fixed!");
}

runTest().catch(console.error);
