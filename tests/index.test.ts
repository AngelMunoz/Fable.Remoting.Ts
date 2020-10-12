import { AxiosRequestConfig } from 'axios';
import { createService } from '../src/index';

type GetResult = { url: string; data: number[]; headers: any }
type GetPostResult = { url: string; data: number[]; postData: any; headers: any };

type IMyService = {
    getSample: () => Promise<GetResult>
    postSample: (data: any) => Promise<GetPostResult>
}


jest.mock("axios", () => ({
    create(opts: AxiosRequestConfig) {
        return {
            defaults: {
                headers: {}
            },
            headers: {},
            get(path: string) {
                const url = opts.baseURL + path
                // serialized hello world
                const data = [129, 165, 104, 101, 108, 108, 111, 165, 119, 111, 114, 108, 100];
                return Promise.resolve({ url, data, headers: { ...this.defaults.headers, ...this.headers } })
            },
            post(path: string, data: any) {
                const url = opts.baseURL + path
                // serialized hello world
                const serializedData = [129, 165, 104, 101, 108, 108, 111, 165, 119, 111, 114, 108, 100]
                return Promise.resolve({ url, data: serializedData, postData: data, headers: { ...this.defaults.headers, ...this.headers } })
            }
        }
    }
}))

describe("Service", () => {
    it("Should create a service", () => {
        const service = createService<IMyService>({
            baseURL: 'http://localhost/',
            serviceName: 'IMyService'
        });
        expect(service).toBeDefined()
        expect(service).toHaveProperty("addHeaders");
        expect(service).toHaveProperty("removeHeaders");
    });

    it("Should add headers", async () => {
        const service = createService<IMyService>({
            baseURL: 'http://localhost/',
            serviceName: 'IMyService'
        });
        service.addHeaders({ 'x-custom-header': 'true' })
        expect(service).toBeDefined()
        const result = await service.getSample();
        expect('x-custom-header' in result.headers).toBeTruthy();
    });

    it("Should remove headers", async () => {
        const service = createService<IMyService>({
            baseURL: 'http://localhost/',
            serviceName: 'IMyService'
        }, { headers: { 'x-custom-header': 'true' } });

        service.removeHeaders('x-custom-header');
        expect(service).toBeDefined()
        const result = await service.getSample();
        expect('x-custom-header' in result.headers).toBeFalsy();
    });

    it("Should build service url from interface", async () => {
        const service = createService<IMyService>({
            baseURL: 'http://localhost/',
            serviceName: 'IMyService'
        });
        const result = await service.getSample();
        const result2 = await service.postSample({});
        expect(result.url).toContain("http://localhost/")
        expect(result.url).toContain("IMyService")
        expect(result.url).toContain("getSample")

        expect(result2.url).toContain("http://localhost/")
        expect(result2.url).toContain("IMyService")
        expect(result2.url).toContain("postSample")
    });

    it("Should pick values from existing service", async () => {
        const existingservice: IMyService & { someProperty: string } = {
            someProperty: "IExist",
            getSample() {
                return Promise.resolve({ data: [], url: "", headers: {} })
            },
            postSample(data) {
                return Promise.resolve({ data: [], url: "", headers: {}, postData: [] })
            }
        }
        const service = createService<IMyService & { someProperty: string }>({
            baseURL: 'http://localhost/',
            serviceName: 'IMyService'
        }, {}, existingservice);
        expect(service.someProperty).toBe("IExist");
    });
    it("Should fallback gracefully", async () => {
        const existingservice: IMyService & { someProperty: string } = {
            someProperty: "IExist",
            getSample() {
                return Promise.resolve({ data: [], url: "", headers: {} })
            },
            postSample(data) {
                return Promise.resolve({ data: [], url: "", headers: {}, postData: [] })
            }
        }
        const service = createService<IMyService & { someProperty: string }>({
            baseURL: 'http://localhost/',
            serviceName: 'IMyService'
        }, {}, existingservice);
        const result = await (service as any).IDontExistAtAll();
        expect(result.url).toContain("http://localhost/")
        expect(result.url).toContain("IMyService")
        expect(result.url).toContain("IDontExistAtAll")
    });

    it("Should post data", async () => {
        const service = createService<IMyService>({
            baseURL: 'http://localhost/',
            serviceName: 'IMyService'
        });
        const result = await service.postSample({ sample: "string" });
        expect(result.postData?.[0]?.sample).toBe('string')
    });

    describe("Service with MsgPack", () => {
        it("Should have MsgPack Enabled", async () => {
            const service = createService<IMyService>({
                baseURL: 'http://localhost/',
                serviceName: 'IMyService',
                withMsgPack: true
            });
            const result = await service.postSample({hello: 'world'});
            expect(result.data).toHaveProperty('hello', 'world');
        })
    });
});