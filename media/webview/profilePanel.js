// Profile 面板前端控制器（原生 JS，零依赖）
// 与 host 通过 postMessage 通信；永不持有原始密钥之外的持久状态。

const vscode = acquireVsCodeApi();
const app = document.getElementById('app');

let profiles = [];
let editing = null; // null = 列表视图；对象 = 编辑中的 profile

/** host → webview */
window.addEventListener('message', (event) => {
    const msg = event.data;
    switch (msg.type) {
        case 'profiles':
            profiles = msg.profiles || [];
            render();
            break;
        case 'saved':
        case 'deleted':
            if (!msg.ok) {
                toast(msg.error || '操作失败', true);
            } else {
                editing = null;
            }
            render();
            break;
        case 'activated':
            if (!msg.ok) toast(msg.error || '激活失败', true);
            break;
        case 'testResult':
            toast(msg.ok ? `连接成功 (${msg.latencyMs}ms)` : '连接失败', !msg.ok);
            break;
    }
});

/** 请求初始数据 */
vscode.postMessage({ type: 'getProfiles' });

function render() {
    app.innerHTML = '';
    if (editing) {
        renderForm();
    } else {
        renderList();
    }
}

function renderList() {
    const header = el('div', 'header');
    header.appendChild(el('h2', null, 'Profiles'));
    const addBtn = el('button', 'btn primary', '+ New');
    addBtn.onclick = () => { editing = { name: '', provider: 'openai', hasKey: false }; render(); };
    header.appendChild(addBtn);
    app.appendChild(header);

    if (profiles.length === 0) {
        app.appendChild(el('div', 'empty', '暂无配置，点击 + New 创建'));
        return;
    }

    const list = el('div', 'list');
    for (const p of profiles) {
        list.appendChild(profileRow(p));
    }
    app.appendChild(list);
}

function profileRow(p) {
    const row = el('div', 'row' + (p.active ? ' active' : ''));
    row.appendChild(el('div', 'name', `${p.active ? '● ' : ''}${p.name}`));
    row.appendChild(el('div', 'meta', `${p.provider} · ${p.model || p.endpoint || ''}`));

    const keyBadge = p.provider === 'openai' || p.provider === 'baidu'
        ? el('span', 'badge ' + (p.hasKey ? 'ok' : 'warn'), p.hasKey ? 'Key ✓' : '无 Key')
        : null;
    if (keyBadge) row.appendChild(keyBadge);

    const actions = el('div', 'actions');
    if (!p.active) {
        const actBtn = el('button', 'btn', 'Activate');
        actBtn.onclick = () => { vscode.postMessage({ type: 'activateProfile', name: p.name }); };
        actions.appendChild(actBtn);
    }
    const testBtn = el('button', 'btn', 'Test');
    testBtn.onclick = () => { vscode.postMessage({ type: 'testConnection', name: p.name }); };
    const editBtn = el('button', 'btn', 'Edit');
    editBtn.onclick = () => { editing = { ...p }; render(); };
    const delBtn = el('button', 'btn danger', 'Delete');
    delBtn.onclick = () => {
        if (confirm(`删除配置 "${p.name}"？密钥将一并清除。`)) {
            vscode.postMessage({ type: 'deleteProfile', name: p.name });
        }
    };
    actions.appendChild(testBtn);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    row.appendChild(actions);
    return row;
}

function renderForm() {
    const p = editing;
    const isNew = !profiles.some(x => x.name === p.name);
    const form = el('div', 'form');
    form.appendChild(el('h2', null, isNew ? 'New Profile' : `Edit ${p.name}`));

    form.appendChild(field('name', 'Name', p.name || '', 'text', !isNew));
    const providerSel = field('provider', 'Provider', p.provider || 'openai', 'select', false,
        [['openai', 'OpenAI / 兼容'], ['ollama', 'Ollama'], ['baidu', 'Baidu']]);
    form.appendChild(providerSel);
    providerSel.querySelector('select').onchange = (e) => {
        editing.provider = e.target.value;
        render(); // 切换 provider 重渲染表单字段
    };

    const provider = p.provider || 'openai';
    if (provider === 'openai') {
        form.appendChild(field('baseUrl', 'Base URL', p.baseUrl || 'https://api.openai.com/v1'));
        form.appendChild(field('model', 'Model', p.model || 'gpt-4o-mini'));
        form.appendChild(field('apiKey', 'API Key', '', 'password'));
        form.appendChild(field('customPrompt', 'Custom Prompt (optional)', p.customPrompt || '', 'textarea'));
    } else if (provider === 'ollama') {
        form.appendChild(field('endpoint', 'Endpoint', p.endpoint || 'http://localhost:11434'));
        form.appendChild(field('model', 'Model', p.model || 'llama3'));
        form.appendChild(field('customPrompt', 'Custom Prompt (optional)', p.customPrompt || '', 'textarea'));
    } else { // baidu
        form.appendChild(field('appId', 'App ID', p.appId || ''));
        form.appendChild(field('secretKey', 'Secret Key', '', 'password'));
    }

    const btnRow = el('div', 'btn-row');
    const saveBtn = el('button', 'btn primary', 'Save');
    saveBtn.onclick = save;
    const cancelBtn = el('button', 'btn', 'Cancel');
    cancelBtn.onclick = () => { editing = null; render(); };
    btnRow.appendChild(saveBtn);
    btnRow.appendChild(cancelBtn);
    form.appendChild(btnRow);
    app.appendChild(form);
}

function save() {
    const p = editing;
    const provider = p.provider || 'openai';
    const name = val('name');
    if (!name) {
        toast('Name 不能为空', true);
        return;
    }
    const profile = { name, provider };
    if (provider === 'openai') {
        profile.baseUrl = val('baseUrl');
        profile.model = val('model');
        if (val('apiKey')) profile.apiKey = val('apiKey');
        if (val('customPrompt')) profile.customPrompt = val('customPrompt');
    } else if (provider === 'ollama') {
        profile.endpoint = val('endpoint');
        profile.model = val('model');
        if (val('customPrompt')) profile.customPrompt = val('customPrompt');
    } else {
        profile.appId = val('appId');
        if (val('secretKey')) profile.secretKey = val('secretKey');
    }
    vscode.postMessage({ type: 'saveProfile', profile });
}

// ---- helpers ----
function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
}

function field(id, label, value, kind = 'text', readonly = false, options = []) {
    const wrap = el('div', 'field');
    wrap.appendChild(el('label', null, label));
    let input;
    if (kind === 'textarea') {
        input = document.createElement('textarea');
        input.value = value;
    } else if (kind === 'select') {
        input = document.createElement('select');
        for (const [v, t] of options) {
            const o = document.createElement('option');
            o.value = v; o.textContent = t;
            if (v === value) o.selected = true;
            input.appendChild(o);
        }
    } else {
        input = document.createElement('input');
        input.type = kind;
        input.value = value;
    }
    input.id = `f-${id}`;
    if (readonly) input.readOnly = true;
    wrap.appendChild(input);
    return wrap;
}

function val(id) {
    const e = document.getElementById(`f-${id}`);
    return e ? e.value.trim() : '';
}

function toast(msg, isError) {
    const t = el('div', 'toast' + (isError ? ' error' : ''), msg);
    app.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}
