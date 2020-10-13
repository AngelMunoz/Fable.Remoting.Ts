import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import msgpack from '@ygoe/msgpack';

/**
 * this is a helper type that provides extra functionality handled by the service proxy
 */
export type BaseService = {
    createRequest<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>>
    addHeaders: (headers: Record<string, string>) => void
    removeHeaders: (...headers: string[]) => void
    addInterceptor: (type: 'response' | 'request', onFulfilled?: AxiosInterceptor, onRejected?: (error: any) => any) => number
    removeInterceptor: (type: 'response' | 'request', id: number) => void
}

export type RequestInterceptor = (value: AxiosRequestConfig) => AxiosRequestConfig | Promise<AxiosRequestConfig>
export type ResponseInterceptor = (value: AxiosResponse<any>) => AxiosResponse<any> | Promise<AxiosResponse<any>>
export type AxiosInterceptor =
    | RequestInterceptor
    | ResponseInterceptor

/**
 * @param {import('axios').AxiosInstance} $http
 */
function addHeadersInternal($http: AxiosInstance) {
    return function addHeaders(headers: Record<string, string>) {
        if (!headers || typeof headers !== 'object') { throw new TypeError('this functioun should have one parameter and it must be an object'); }
        $http.defaults.headers = { ...$http.defaults.headers, ...headers }
    }
}

/**
 * @param {import('axios').AxiosInstance} $http
 */
function removeHeadersInternal($http: AxiosInstance) {
    return function removeHeaders(...headers: string[]) {
        if (!headers) { throw new TypeError('This function should have at least 1 parameter'); }
        for (const header of headers) {
            delete $http.defaults.headers[header];
        }
    }
}

function addInterceptorInternal($http: AxiosInstance) {
    return function addInterceptor(type: 'request' | 'response', onFulfilled: AxiosInterceptor, onRejected: (error: any) => any) {
        if (!onFulfilled && !onRejected) { throw new TypeError("No interceptor was provided"); }
        switch (type) {
            case 'request':
                return $http.interceptors[type].use(onFulfilled as RequestInterceptor, onRejected)
            case 'response':
                return $http.interceptors[type].use(onFulfilled as ResponseInterceptor, onRejected)
        }
    }
}

function removeInterceptorInternal($http: AxiosInstance) {
    return function removeInterceptor(type: 'request' | 'response', id: number) {
        return $http.interceptors[type].eject(id);
    }
}
function createRequestInternal($http: AxiosInstance) {
    return function createRequest<T>(config: AxiosRequestConfig) {
        return $http.request<T>(config);
    }
}

/**
 * @param {import('axios').AxiosInstance} $http
 */
function defaultTapInternal($http: AxiosInstance, serviceName: string, property: string | number | symbol, withMsgPack = false) {
    return function defaultTrap(...args: any[]) {
        const url = `${serviceName}/${String(property)}`
        const isPost = args.length > 0;
        const request = isPost ? $http.post(url, [...args]) : $http.get(url);
        return request.then(result => {
            if (withMsgPack) {
                const data = msgpack.deserialize(result.data);
                return { ...result, data };
            }
            return result;
        });
    }
}

type RemotingConfiguration = {
    baseURL: string;
    serviceName: string;
    withMsgPack: boolean
};

type RemotingConfigParam = Required<Pick<RemotingConfiguration, 'baseURL' | 'serviceName'>> & Partial<RemotingConfiguration>;
/**
 * Creates a proxy object that makes calls to an API based on the invoked method, each service also has access to a single axios instance which can be configured completely
 * @param {RemotingConfigParam} config provides the baseurl as well as some extra options like the the service name in the server and if it's using msgpack
 * @param {import('axios').AxiosRequestConfig} axiosConfig optional configuration for the axios instance
 * @param {BaseService} baseService 
 */
export function createService<T extends object>({ baseURL, serviceName, withMsgPack }: RemotingConfigParam, axiosConfig?: AxiosRequestConfig, baseService: T = {} as T): T & BaseService {
    const $http = axios.create({
        baseURL,
        headers: {
            ...(withMsgPack && { 'Content-Type': 'application/msgpack', 'Accept': 'application/json, application/msgpack' })
        },
        ...(withMsgPack && { responseType: 'arraybuffer' }),
        ...(axiosConfig && axiosConfig)
    });
    return new Proxy<T & BaseService>(baseService as T & BaseService, {
        get(target, property, reciever) {
            switch (property) {
                case 'addHeaders':
                    return addHeadersInternal($http);
                case 'removeHeaders':
                    return removeHeadersInternal($http);
                case 'addInterceptor':
                    return addInterceptorInternal($http);
                case 'removeInterceptor':
                    return removeInterceptorInternal($http);
                case 'createRequest':
                    return createRequestInternal($http);
                default:
                    // of the function/property exists in the object then invoke that one
                    // else try to invoke a default axios call
                    try {
                        var existing = Reflect.get(target, property, reciever);
                    } catch (err) {
                        existing = null;
                    }
                    return existing ?? defaultTapInternal($http, serviceName, property, withMsgPack);
            }
        }
    });
}