[Fable.Remoting]: https://zaid-ajaj.github.io/Fable.Remoting/
[msgpack.js]: https://github.com/ygoe/msgpack.js/
[Axios]: https://github.com/axios/axios

# Fable.Remoting.Ts

![CI](https://github.com/AngelMunoz/Fable.Remoting.Ts/workflows/CI/badge.svg)
[![npm version](https://img.shields.io/npm/v/fable.remoting.ts)](https://www.npmjs.com/package/fable.remoting.ts)


This is a simple proxy-based library that tries to help you interact with your .net server in a simple way.

[Fable.Remoting] is one incredibly nice way to interact with your server where you define your types in a shared project/file and then you just invoke functions based on those declared types.

Sometimes you won't be able (or don't want to) use F# as the client of your F#/C# server and that sadly takes some of the Fable.Remoting Advantages away (apparently) if you enable raw http in Fable.Remoting, then you can use this library to ease some of those interactions

# Requirements
This library uses ES2015 Proxy so there's no IE support it also uses [Axios] and [msgpack.js] so it should be usable both in your browser and any node.js environment

## Usage

> you can also check a sample [here](https://github.com/AngelMunoz/Remotron/blob/master/app.js) and [here](https://github.com/AngelMunoz/Remotron/blob/master/Program.fs#L33)

```ts
import { createService } from 'fable.remoting.ts'

const service = createService({ 
    // where is your server at?
    baseURL: 'http://localhost:5000',
    // this is the name of the service you registered within your server
    serviceName: 'IBooksService',
    // wether your server is sending msgpack messages
    withMsgPack: false
});

// use getBooks anywhere else
const getBooks = async () => {
    //the name of the service method you want to invoke on the server
    try {
        const results = await service.getBooks();
        return results;
    } catch(error) {
        console.warn(error.message);
        return [];
    }
}

// use saveBook somewhere else
const saveBook = async (book: Book)  => {
    try {
        const results = await service.saveBook(book);
        return results;
    } catch(error) {
        console.warn(error.message);
        throw Error(error);
    }
}
```

### type safety

If you want to have a little bit more of type safety you might want to create an interface/type that represents what your server is doing for you (what you would normally do with F# types)

```ts
interface IBooksService {
    getBooks: () => Promise<Book[]>
    saveBook: (book: Bool) => Promise<book>
}

const service = createService<IBooksService>({ 
    // where is your server at?
    baseURL: 'http://localhost:5000',
    // this is the name of the service you registered within your server
    serviceName: 'IBooksService',
    // wether your server is sending msgpack messages
    withMsgPack: false
});

// now you have typescript autocompletition
service.getBooks()
// typescript will complain about this
// service.IDontExist()
// although if you cast service as "any" it will still try to make the call to 
// http://localhost:5000/IBooksService/IDontExist
// so if you are using pure javascript be careful about this

```

### Extra configuring
If you want to customize further your http calls, you can pass axios options to your `createService` call, each createService call provides you with an axios instance

```ts

const service = createService<IBooksService>(
    { 
        // where is your server at?
        baseURL: 'http://localhost:5000',
        // this is the name of the service you registered within your server
        serviceName: 'IBooksService',
        // wether your server is sending msgpack messages
        withMsgPack: false
    }, 
    {
        headers: { /* ... any header you want to add ...*/ }
        proxy: { /* ... proxy options ... */},
        xsrfCookieName: 'cookie name',
        // ... and any other AxiosRequest options
    }
);
```

If you need to provide a new header (or delete) to an existing service instance, you can call 
- addHeaders
- removeHeaders
methods accordingly 

```ts
service.addHeaders({ 
    /* ... any headers you want to add here ...*/
    Authorization: 'Bearer ...token...'
});
// removeHeaders accepts any amount of string parameters
service.removeHeaders('Authorization', 'x-my-custom-header', ...myOtherHeaders);
```

### Augment an existing service
You can use an existing service that is not made by Fable.Remoting.Ts, perhaps you already have services in place and want to add those extra functions


```ts
type IExistingService = {
    somePropertyForSomeReason: string;
    login(username: string; password: string) => Promise<AuthResponse>;
    Signup(user: SignupPayload) => Promise<AuthResponse>;
};

const existingService: IExistingService = createFromDIOrSomewhereElse();

const service = createService<IExistingService & IBooksService>({ 
    // where is your server at?
    baseURL: 'http://localhost:5000',
    // this is the name of the service you registered within your server
    serviceName: 'IBooksService',
    // whether your server is sending msgpack messages
    withMsgPack: false
}, null, existingService);

/**
 * For example let's try to login (existing service)
 * and get books (from proxy service) with a jwt token as authorization.
 **/
async function loginAndGetBooks() {
    // service will pick the login method from `existingService`
    const { token } = await service.login('admin@admin.com', 'super secret much wow')
    service.addHeaders({ Authorization: `Bearer ${token}` })
    // service will pick the getBooks method from the default proxy trap
    const books = await service.getBooks()
    console.log(books)
    // service will pick the somePropertyForSomeReason property from the `existingService` object
    console.log(service.somePropertyForSomeReason)
}
```


