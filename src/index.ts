import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import msgpack from '@ygoe/msgpack';

/**
 * this is a helper type that provides extra functionality handled by the service proxy
 */
export type BaseService = {
    addHeaders: (headers: Record<string, string>) => void
    removeHeaders: (...headers: string[]) => void
}

/**
 * @param {import('axios').AxiosInstance} $http
 */
function addHeadersInternal($http: AxiosInstance) {
    return function addHeaders() {
        const headers = arguments.length > 0 ? arguments[0] : null;
        if (!headers || typeof headers !== 'object') { throw new TypeError('this functioun should have one parameter and it must be an object'); }
        $http.defaults.headers = { ...$http.defaults.headers, ...headers }
    }
}

/**
 * @param {import('axios').AxiosInstance} $http
 */
function removeHeadersInternal($http: AxiosInstance) {
    return function removeHeaders() {
        const headers: string[] | null = arguments.length <= 0 ? null : [...arguments];
        if (!headers) { throw new TypeError('This function should have at least 1 parameter'); }
        if (!Array.isArray(headers)) { throw new TypeError('header params must be strings') }
        for (const header of headers) {
            delete $http.defaults.headers[header];
        }
    }
}

/**
 * @param {import('axios').AxiosInstance} $http
 */
function defaultTapInternal($http: AxiosInstance, serviceName: string, property: string | number | symbol, withMsgPack = false) {
    return function defaultTrap() {
        const url = `${serviceName}/${String(property)}`
        const isPost = arguments.length > 0
        let data: Array<any> | Uint8Array = [...arguments];
        if (withMsgPack) {
            data = msgpack.serialize([...arguments]);
        }
        return isPost ? $http.post(url, data) : $http.get(url);
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
        ...(axiosConfig && axiosConfig)
    });
    return new Proxy<T & BaseService>(baseService as T & BaseService, {
        get(target, property, reciever) {
            if (property === 'addHeaders') {
                return addHeadersInternal($http)
            }
            if (property === 'removeHeaders') {
                return removeHeadersInternal($http)
            }
            // of the function/property exists in the object then invoke that one
            // else try to invoke a default axios call
            try {
                var existing = Reflect.get(target, property, reciever)
            } catch (err) {
                if (err instanceof TypeError) { existing = null; }
            }
            return existing ?? defaultTapInternal($http, serviceName, property, withMsgPack);
        }
    });
}