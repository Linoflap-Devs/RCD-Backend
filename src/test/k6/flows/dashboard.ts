import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution'

export const options = {
    vus: 5,        // virtual users (1 = single user, like you testing manually)
    iterations: 5  // how many times to run the flow
}

// check variables
const testUser = __ENV.TEST_USER
const testPassword = __ENV.TEST_PASSWORD
const domain = 'http://localhost:3000';

export const setup = () => {
    
}


export default function () {
    if(!testUser || !testPassword) {
        console.error('Please set TEST_EMAIL and TEST_PASSWORD environment variables');
        exec.test.abort('Missing environment variables');
    }

    const baseUrl = `${domain}/api`;

    // login 

    const login = http.post(`${baseUrl}/auth/login-employee`, JSON.stringify({
        "username": testUser,
        "password": testPassword
    }), {
        headers: { 'Content-Type': 'application/json' },
    });

    check(login, {
        'login successful': (res: any) => res.status === 200
    });
    console.log(`Login took: ${login.timings.duration}ms`);

    // check dashboard

    const dashboard = http.get(`${baseUrl}/dashboard/web`, {
        headers: {
            'Content-Type': 'application/json',
        },
        //cookies: login.cookies
    })

    check(dashboard, { 'dashboard successful': (r) => r.status === 200 });
    console.log(`Dashboard took: ${dashboard.timings.duration}ms`)
}