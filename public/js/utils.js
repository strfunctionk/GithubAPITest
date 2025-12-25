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
            // Symbol 접근 제외
            if (typeof prop === 'string') {
                // 실제 데이터 키만 추적 (프로토타입 메서드, 내장 프로퍼티 제외)
                // 배열의 경우 인덱스만, 객체의 경우 자신의 키만
                var isDataKey = Object.prototype.hasOwnProperty.call(obj, prop);
                
                if (isDataKey) {
                    var currentPath = path ? path + '.' + prop : prop;
                    usedKeys.add(currentPath);
                    
                    // 재귀적으로 Proxy 생성
                    return createTrackingProxy(obj[prop], usedKeys, currentPath);
                }
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

// Helper to get value by path string
function getValueByPath(obj, path) {
    return path.split('.').reduce(function(o, p) {
        return (o && o[p] !== undefined) ? o[p] : undefined;
    }, obj);
}

// Render Only Used Data
function renderUsedData(data, usedKeys) {
    if (usedKeys.size === 0) return 'No data accessed.';
    
    var html = '<table style="width:100%; border-collapse: collapse; font-size:12px;">';
    html += '<tr style="background:#eee; text-align:left;"><th style="padding:8px;">Path (Key)</th><th style="padding:8px;">Value</th></tr>';
    
    var sortedKeys = Array.from(usedKeys).sort();
    
    sortedKeys.forEach(function(path) {
        var value = getValueByPath(data, path);
        var displayValue = JSON.stringify(value);
        if (displayValue && displayValue.length > 100) displayValue = displayValue.substring(0, 100) + '...';
        
        html += '<tr style="border-bottom:1px solid #eee;">';
        html += '<td style="padding:6px; color:#d73a49; font-family:monospace;">' + path + '</td>';
        html += '<td style="padding:6px; color:#032f62; font-family:monospace;">' + displayValue + '</td>';
        html += '</tr>';
    });
    
    html += '</table>';
    return html;
}

// Render Schema Mode (Collapsed Array + Types)
function renderSchemaMode(data, usedKeys) {
    if (usedKeys.size === 0) return 'No data accessed.';
    
    var schemaMap = new Map(); // Normalized Path -> Type String

    usedKeys.forEach(function(path) {
        var value = getValueByPath(data, path);
        var type = Array.isArray(value) ? 'array' : (value === null ? 'null' : typeof value);
        
        // Normalize path: replace .0 .12 with []
        // By replacing ".digits", we get "property[].nextProperty" or "property[]" (at end)
        var normalizedPath = path.replace(/\.(\d+)/g, '[]');
        
        // Handle root array index access like "0.name" -> "[].name"
        if (/^\d+(\.|$)/.test(normalizedPath)) {
            normalizedPath = normalizedPath.replace(/^\d+/, '[]');
        }

        // Store type
        if (!schemaMap.has(normalizedPath)) {
            schemaMap.set(normalizedPath, new Set());
        }
        schemaMap.get(normalizedPath).add(type);
    });
    
    var html = '<table style="width:100%; border-collapse: collapse; font-size:12px;">';
    html += '<tr style="background:#eee; text-align:left;"><th style="padding:8px;">Normalized Path</th><th style="padding:8px;">Type</th></tr>';
    
    var sortedPaths = Array.from(schemaMap.keys()).sort();
    
    sortedPaths.forEach(function(path) {
        var types = Array.from(schemaMap.get(path)).join(' | ');
        
        html += '<tr style="border-bottom:1px solid #eee;">';
        html += '<td style="padding:6px; color:#6f42c1; font-family:monospace; font-weight:bold;">' + path + '</td>';
        html += '<td style="padding:6px; color:#032f62; font-family:monospace;">' + types + '</td>';
        html += '</tr>';
    });
    
    html += '</table>';
    return html;
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
                '<div>' +
                    '<h3 style="margin:0; display:inline-block; margin-right:15px;">API Usage Tracker</h3>' +
                    '<label style="margin-right:10px;"><input type="checkbox" id="showUsedOnly"> Show Used Values</label>' +
                    '<label><input type="checkbox" id="showSchema"> Show Schema (Type)</label>' +
                '</div>' +
                '<button class="btn" id="closeDebug">Close</button>' +
            '</div>' +
            '<div class="debug-body" id="debugBody">' +
                'No API calls yet.' +
            '</div>' +
        '</div>';
    document.body.appendChild(modal);

    function updateDebugView() {
        var showUsedOnly = document.getElementById('showUsedOnly').checked;
        var showSchema = document.getElementById('showSchema').checked;
        var body = document.getElementById('debugBody');
        
        // Checkbox interaction logic (Radio-like behavior or priority)
        // Let's make Schema priority if both checked, or just respect state.
        
        var historyHtml = window.apiHistory.slice().reverse().map(function(item) {
            var content = '';
            if (showSchema) {
                content = renderSchemaMode(item.data, item.usedKeys);
            } else if (showUsedOnly) {
                content = renderUsedData(item.data, item.usedKeys);
            } else {
                content = '<pre style="white-space: pre-wrap; word-break: break-all;">' + renderJSON(item.data, item.usedKeys) + '</pre>';
            }

            return '<div style="margin-bottom: 20px; border-bottom: 1px dashed #ccc; padding-bottom: 10px;">' +
                '<div style="color: #0969da; font-weight: bold; margin-bottom: 5px;">' +
                    '[' + item.timestamp + '] ' + item.endpoint +
                '</div>' +
                '<div style="color: #666; font-size: 11px; margin-bottom: 5px;">' +
                    'Params: ' + JSON.stringify(item.params) +
                '</div>' +
                content +
            '</div>';
        }).join('') || 'No data captured.';

        body.innerHTML = historyHtml;
    }

    btn.addEventListener('click', function() {
        modal.classList.add('active');
        updateDebugView();
    });

    document.getElementById('showUsedOnly').addEventListener('change', function(e) {
        if(e.target.checked) document.getElementById('showSchema').checked = false;
        updateDebugView();
    });
    
    document.getElementById('showSchema').addEventListener('change', function(e) {
        if(e.target.checked) document.getElementById('showUsedOnly').checked = false;
        updateDebugView();
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
