import mitt from 'mitt';
import queryString from 'query-string';

class FakeXMLHttpRequestServer {
  constructor(host = location.host, config) {
    this.host = host;
    this.config = config;
    this.emitter = mitt();

    window.__fakeXhr__[host] = (xhr) => this.emit(xhr);
  }
  on(...args) {
    this.emitter.on(...args);
  }
  off(...args) {
    this.emitter.off(...args);
  }
  emit(xhr) {
    let url;
    if (/^http|https/.test(xhr.url)) {
      url = new URL(xhr.url);
    } else {
      url = new URL(location.origin + xhr.url);
    }

    this.emitter.emit(url.pathname, {
      url: xhr.url,
      method: xhr.method,
      pathname: url.pathname,
      body: xhr.requestBody,
      query: queryString.parse(url.search),
      xhr
    });
  }
  destory() {
    window.__fakeXhr__ = {};
  }
};

export {
  FakeXMLHttpRequestServer
}