let _token = null;
let _getter = null;

export const setToken = (t) => { _token = t; };
export const getToken = () => _token;
export const setTokenGetter = (fn) => { _getter = fn; };
export const refreshToken = async () => {
  if (_token) return _token;
  if (_getter) {
    const t = await _getter();
    if (t) { _token = t; return t; }
  }
  return null;
};

export const clearToken = () => { _token = null; };
