// GitHub API Helper

var API_BASE = '/v1/api/github';

function getAuthToken() {
    return localStorage.getItem('github_token');
}

function setAuthToken(token) {
    localStorage.setItem('github_token', token);
    console.log('Token saved:', token);
}

function clearAuthToken() {
    localStorage.removeItem('github_token');
}

function requireAuth() {
    if (!getAuthToken()) {
        window.location.href = '/login';
    }
}

// Global API History
window.apiHistory = [];

// Proxy Helper for Tracking Access
function createTrackingProxy(target, usedKeys, path) {
    if (typeof target !== 'object' || target === null) return target;
    path = path || '';

    return new Proxy(target, {
        get: function(obj, prop) {
            // Symbol이나 내장 함수 접근 제외
            if (typeof prop === 'string') {
                var currentPath = path ? path + '.' + prop : prop;
                usedKeys.add(currentPath);
                
                // 재귀적으로 Proxy 생성
                return createTrackingProxy(obj[prop], usedKeys, currentPath);
            }
            return Reflect.get(obj, prop);
        }
    });
}

async function fetchAPI(endpoint, params) {
    params = params || {};
    var token = getAuthToken();
    if (!token) throw new Error('No access token');

    var url = new URL(endpoint, window.location.origin);
    Object.keys(params).forEach(function(key) {
        if (params[key]) url.searchParams.append(key, params[key]);
    });

    var res = await fetch(url, {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    });

    var rawData = await res.json();
    
    // Debug Logging
    console.groupCollapsed('[API Call] ' + endpoint);
    console.log('Endpoint:', endpoint);
    console.log('Params:', params);
    console.log('Response Data:', rawData);
    console.groupEnd();

    // Setup Tracking
    var usedKeys = new Set();
    var trackedData = createTrackingProxy(rawData, usedKeys);

    // Store in History
    window.apiHistory.push({
        timestamp: new Date().toLocaleTimeString(),
        endpoint: endpoint,
        params: params,
        data: rawData,
        usedKeys: usedKeys
    });
    // Keep only last 10
    if (window.apiHistory.length > 10) window.apiHistory.shift();

    if (!res.ok) {
        throw new Error(rawData.error?.reason || rawData.message || 'API Request Failed');
    }
    
    return trackedData;
}

// Common User Fetch
async function fetchUser() {
    try {
        var data = await fetchAPI(API_BASE + '/test/user');
        return data.success.user;
    } catch (e) {
        console.error("Failed to fetch user", e);
        if (e.message.includes('401') || e.message.includes('Unauthorized')) {
            clearAuthToken();
            window.location.href = '/login';
        }
        return null;
    }
}

// Render Header User Info
async function renderHeader() {
    var user = await fetchUser();
    if (user) {
        var userEl = document.getElementById('headerUser');
        if (userEl) {
            userEl.innerHTML = '<img src="' + user.avatar_url + '" width="20" height="20" style="border-radius:50%; vertical-align:middle; margin-right:8px;">' +
                user.login +
                '<button class="btn-logout" onclick="logout()">Sign out</button>';
        }
    }
}

function logout() {
    clearAuthToken();
    window.location.href = '/login';
}

// Custom JSON Renderer with Highlighting
function renderJSON(data, usedKeys, path, level) {
    path = path || '';
    level = level || 0;
    var indent = '  '.repeat(level);
    
    if (Array.isArray(data)) {
        if (data.length === 0) return '[]';
        var html = '[\n';
        data.forEach(function(item, index) {
            var currentPath = path ? path + '.' + index : String(index);
            html += indent + '  ' + renderJSON(item, usedKeys, currentPath, level + 1) + (index < data.length - 1 ? ',' : '') + '\n';
        });
        html += indent + ']';
        return html;
    } else if (typeof data === 'object' && data !== null) {
        if (Object.keys(data).length === 0) return '{}';
        var html = '{\n';
        var keys = Object.keys(data);
        keys.forEach(function(key, index) {
            var currentPath = path ? path + '.' + key : key;
            var isUsed = usedKeys.has(currentPath);
            var value = data[key];
            var valueHtml = renderJSON(value, usedKeys, currentPath, level + 1);
            
            var style = isUsed ? 'background-color: #fffbdd; color: #d73a49; font-weight: bold;' : '';
            
            html += indent + '  <span style="' + style + '">"' + key + '"</span>: ' + valueHtml + (index < keys.length - 1 ? ',' : '') + '\n';
        });
        html += indent + '}';
        return html;
    } else {
        if (typeof data === 'string') return '"' + data.replace(/"/g, '\\"') + '"';
        return String(data);
    }
}

// Debug Viewer Feature
function initDebugViewer() {
    if (document.getElementById('debugBtn')) return;

    var btn = document.createElement('button');
    btn.id = 'debugBtn';
    btn.className = 'debug-btn';
    btn.innerText = '🔍 Usage';
    document.body.appendChild(btn);

    var modal = document.createElement('div');
    modal.className = 'debug-modal';
    modal.innerHTML = 
        '<div class="debug-content">' +
            '<div class="debug-header">' +
                '<h3>API Usage Tracker (Highlighted = Used)</h3>' +
                '<button class="btn" id="closeDebug">Close</button>' +
            '</div>' +
            '<div class="debug-body" id="debugBody">' +
                'No API calls yet.' +
            '</div>' +
        '</div>';
    document.body.appendChild(modal);

    btn.addEventListener('click', function() {
        modal.classList.add('active');
        var body = document.getElementById('debugBody');
        
        var historyHtml = window.apiHistory.slice().reverse().map(function(item) {
            return '<div style="margin-bottom: 20px; border-bottom: 1px dashed #ccc; padding-bottom: 10px;">' +
                '<div style="color: #0969da; font-weight: bold; margin-bottom: 5px;">' +
                    '[' + item.timestamp + '] ' + item.endpoint +
                '</div>' +
                '<div style="color: #666; font-size: 11px; margin-bottom: 5px;">' +
                    'Params: ' + JSON.stringify(item.params) +
                '</div>' +
                '<pre style="white-space: pre-wrap; word-break: break-all;">' + renderJSON(item.data, item.usedKeys) + '</pre>' +
            '</div>';
        }).join('') || 'No data captured.';

        body.innerHTML = historyHtml;
    });

    document.getElementById('closeDebug').addEventListener('click', function() {
        modal.classList.remove('active');
    });
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.classList.remove('active');
    });
}

function timeAgo(dateString) {
    var date = new Date(dateString);
    return date.toLocaleDateString();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDebugViewer);
} else {
    initDebugViewer();
}
