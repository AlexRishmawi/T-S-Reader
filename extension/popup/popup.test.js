import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { formatMarkDown } = require('./popup.js');

class MockNode {
    constructor(nodeType, nodeName, textContent = '') {
        this.nodeType = nodeType; // 1 = Element, 3 = TextNode, 11 = DocumentFragment
        this.nodeName = nodeName;
        this.children = [];
        this._textContent = textContent;
    }

    get textContent() {
        if (this.nodeType === 3) return this._textContent;
        if (this.children.length === 0) return this._textContent;
        return this.children.map(c => c.textContent).join('');
    }

    set textContent(val) {
        this._textContent = String(val);
        if (this.nodeType === 1) {
            this.children = [new MockNode(3, '#text', String(val))];
        }
    }

    appendChild(child) {
        this.children.push(child);
        return child;
    }
}

class MockDocument {
    createDocumentFragment() {
        return new MockNode(11, '#document-fragment');
    }
    createElement(tagName) {
        return new MockNode(1, tagName.toUpperCase());
    }
    createTextNode(text) {
        return new MockNode(3, '#text', text);
    }
}

function getAllElementNames(node) {
    const names = [];
    if (node.nodeType === 1) {
        names.push(node.nodeName);
    }
    for (const child of node.children) {
        names.push(...getAllElementNames(child));
    }
    return names;
}

test('formatMarkDown returns empty fragment for falsy text', () => {
    const doc = new MockDocument();
    const result = formatMarkDown('', doc);
    assert.equal(result.nodeType, 11);
    assert.equal(result.children.length, 0);
});

test('formatMarkDown parses plain text paragraph', () => {
    const doc = new MockDocument();
    const result = formatMarkDown('Hello world', doc);
    assert.equal(result.children.length, 1);
    const p = result.children[0];
    assert.equal(p.nodeName, 'P');
    assert.equal(p.textContent, 'Hello world');
    assert.equal(p.children[0].nodeType, 3); // TextNode
});

test('formatMarkDown parses bold text correctly using strong element', () => {
    const doc = new MockDocument();
    const result = formatMarkDown('This is **important** info.', doc);
    const p = result.children[0];
    assert.equal(p.nodeName, 'P');
    assert.equal(p.children.length, 3);
    assert.equal(p.children[0].nodeType, 3);
    assert.equal(p.children[0].textContent, 'This is ');
    assert.equal(p.children[1].nodeName, 'STRONG');
    assert.equal(p.children[1].textContent, 'important');
    assert.equal(p.children[2].nodeType, 3);
    assert.equal(p.children[2].textContent, ' info.');
});

test('formatMarkDown parses bullet lists with - and *', () => {
    const doc = new MockDocument();
    const markdown = '- First item\n* Second item with **bold**';
    const result = formatMarkDown(markdown, doc);
    assert.equal(result.children.length, 1);
    const ul = result.children[0];
    assert.equal(ul.nodeName, 'UL');
    assert.equal(ul.children.length, 2);
    assert.equal(ul.children[0].nodeName, 'LI');
    assert.equal(ul.children[0].textContent, 'First item');
    assert.equal(ul.children[1].nodeName, 'LI');
    assert.equal(ul.children[1].children[1].nodeName, 'STRONG');
    assert.equal(ul.children[1].children[1].textContent, 'bold');
});

test('formatMarkDown prevents XSS injection payloads', () => {
    const doc = new MockDocument();
    const xssPayload = "<script>alert('xss')</script>\n- <img src=x onerror=alert(1)>\n* **<svg onload=alert(2)>**";
    const result = formatMarkDown(xssPayload, doc);

    const elementNames = getAllElementNames(result);
    // Should ONLY contain safe structural elements: P, UL, LI, STRONG
    assert.deepEqual(elementNames.sort(), ['LI', 'LI', 'P', 'STRONG', 'UL']);

    // Ensure raw payload text was preserved safely in textContent without executing or creating element tags
    assert.ok(result.textContent.includes("<script>alert('xss')</script>"));
    assert.ok(result.textContent.includes("<img src=x onerror=alert(1)>"));
    assert.ok(result.textContent.includes("<svg onload=alert(2)>"));
});
