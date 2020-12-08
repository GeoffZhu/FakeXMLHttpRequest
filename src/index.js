export { FakeXMLHttpRequest as XMLHttpRequest } from './xhr';
export { FakeXMLHttpRequestServer as XMLHttpRequestServer } from './xhr-server';

// 用于保存服务实例
window.__fakeXhr__ = {};
