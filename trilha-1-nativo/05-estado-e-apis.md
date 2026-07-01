# Tópico 5 — Estado & APIs (Trilha 1: Devs Nativos)

> **Perfil:** Devs com background Android/iOS. Já lidam com ViewModel/LiveData (Android) ou @StateObject/@ObservedObject (iOS/SwiftUI). O foco é mapear esses padrões para o ecossistema React e entender as diferenças de modelo mental.

---

## Objetivo do tópico

Ao final, o dev deve conseguir:
- Gerenciar estado local com `useState` e `useReducer`
- Usar Context API para estado compartilhado simples
- Implementar estado global com Zustand (recomendado) ou Redux Toolkit
- Consumir APIs REST com TanStack Query
- Persistir dados localmente com MMKV
- Entender a divisão: server state vs client state

---

## Mapeamento: Android/iOS → React/RN

| Nativo | React Native | Observação |
|--------|-------------|------------|
| `ViewModel` + `LiveData` | Zustand store | Store reativo, sem boilerplate |
| `@StateObject` (SwiftUI) | `useState` / `useReducer` | Estado local do componente |
| `SharedPreferences` / `UserDefaults` | MMKV / AsyncStorage | MMKV é síncrono e 30x mais rápido |
| `Retrofit` / `URLSession` | TanStack Query + Axios/fetch | Cache, retry e loading states automáticos |
| `Repository Pattern` | Custom hook + TanStack Query | Separação de responsabilidades mantida |
| `Room` / `CoreData` | MMKV + estrutura manual ou WatermelonDB | Para dados relacionais complexos |

---

## Estado local: useState e useReducer

```tsx
// useState — para valores simples
const [count, setCount] = useState(0);

// useReducer — para lógica mais complexa (análogo ao ViewModel com events)
type State = { count: number; status: 'idle' | 'loading' };
type Action = { type: 'INCREMENT' } | { type: 'SET_LOADING' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'INCREMENT': return { ...state, count: state.count + 1 };
    case 'SET_LOADING': return { ...state, status: 'loading' };
    default: return state;
  }
}

const [state, dispatch] = useReducer(reducer, { count: 0, status: 'idle' });
```

---

## Estado global: Zustand (recomendado para apps de médio porte)

```bash
npm install zustand
```

```tsx
// store/useAuthStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage } from '../lib/storage'; // MMKV adapter

type AuthStore = {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => storage), // MMKV
    }
  )
);

// Uso no componente
const { user, logout } = useAuthStore();
```

> **Por que Zustand?** 2KB, sem providers, API baseada em hooks, 30-50% mais eficiente que Redux para apps médios. Para times grandes com regras complexas, Redux Toolkit ainda se justifica.

---

## Estado global: Redux Toolkit (para apps grandes)

```bash
npm install @reduxjs/toolkit react-redux
```

```tsx
// store/productsSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchProducts = createAsyncThunk(
  'products/fetch',
  async () => {
    const response = await fetch('https://api.example.com/products');
    return response.json();
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState: { items: [], status: 'idle' },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      });
  },
});
```

---

## APIs REST: TanStack Query

```bash
npm install @tanstack/react-query
```

```tsx
// App.tsx — configuração da raiz
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      retry: 2,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Navigation />
    </QueryClientProvider>
  );
}
```

```tsx
// hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => fetch('/api/products').then(r => r.json()),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NewProduct) =>
      fetch('/api/products', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      // Invalida cache — próxima renderização refaz o fetch
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// Uso na tela
const { data, isLoading, error } = useProducts();
const { mutate: createProduct } = useCreateProduct();
```

> **TanStack Query + React Navigation:** Use `useIsFocused()` para refazer fetch ao voltar para uma tela, replicando o comportamento do `onResume` do Android.

---

## Persistência local: MMKV

```bash
npm install react-native-mmkv react-native-nitro-modules
cd ios && pod install
```

```tsx
// lib/storage.ts
import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV();

// API síncrona — sem async/await
storage.set('token', 'abc123');
const token = storage.getString('token');
storage.delete('token');
```

### Adapter MMKV para Zustand persist

```tsx
import { StateStorage } from 'zustand/middleware';

export const zustandStorage: StateStorage = {
  setItem: (name, value) => storage.set(name, value),
  getItem: (name) => storage.getString(name) ?? null,
  removeItem: (name) => storage.delete(name),
};
```

---

## Arquitetura recomendada: Zustand (client state) + TanStack Query (server state)

```
src/
├── stores/          # Zustand: auth, UI state, preferências
│   ├── useAuthStore.ts
│   └── useThemeStore.ts
├── hooks/           # TanStack Query: dados do servidor
│   ├── useProducts.ts
│   └── useOrders.ts
├── services/        # Funções de fetch (sem lógica de UI)
│   └── api.ts
└── lib/
    └── storage.ts   # MMKV instance
```

> Essa separação cobre ~95% dos casos de uso de um app mobile — equivalente ao pattern ViewModel + Repository nativo.

---

## Exercício prático

1. Crie uma store Zustand para autenticação com persistência em MMKV
2. Implemente `useProducts` com TanStack Query consumindo uma API pública (ex: `https://fakestoreapi.com/products`)
3. Adicione paginação com `useInfiniteQuery`
4. Invalide o cache após criar um novo produto com `useMutation`
5. Teste o comportamento offline desligando o Wi-Fi

---

## Materiais de estudo

### Vídeos

#### Learn Redux Toolkit In 11 Minutes — React Native Tutorial
[Assistir no YouTube](https://www.youtube.com/watch?v=o21Ln1Ib4Bo)

<details>
<summary>Transcrição completa</summary>

as I have mentioned before Redux Toolkit is simpler cleaner easier and the best part has a great documentations in this lesson we're going to create our store and reducer and actions and update the state in just one lesson just using Redux toolkit documentations it's very simple just type Redux toolkit and open that link let's get started with those great documentations just to scroll down to install it I'm going to use yarn so let's copy that line and go to our editor let's paste it here let's install that package to react Redux and now let's press at quick start here let's scroll down scroll down first that's our store let's copy that code and go in our code let's run our project first yarn start and let's press I to run the iOS now here in our code let's create a folder inside our SRC let's create a store folder inside this store folder let's create a store file store.TS and let's just paste the code that we've copied okay and let's press save now we have done with the store it's very easy don't worry about that code I will explain every line of code so don't worry about it you can use JavaScript here if you want to use the store with JavaScript look it's very very very simple but since we're using typescript so let's use it typescript let's scroll down after we have created our store we need to connect our store with our our react code using react Redux so let's copy those two lines of code the provider and the store and go to app.TSX let's paste them here just make that SRC SRC store SL store that path you can copy that path using copy relative path lock now let's add our provider or let's copy it from documentations we have a great documentations let's press save we got a warning because we didn't make our reducer yet okay but our app is still working so no need to worry let's go to next step and it's the slice just copy that code if you are using typescript if you are using JavaScript press here and copy the code but since we're using typescript so let's press on typescript and press copy and let's in our store let's create a new folder called counter reducer or counter slice whatever you want and just paste that code here okay don't worry I will explain every line of code so don't worry if you don't understand anything anything don't worry at all let's scroll down that's our last step and we just need to import our reducer to use it in our store okay we're just copy that line of code or we can make it manually if you want just instore inside this reducer object just paste it here or type it manually and counter reducer we can import it from here import counter reducer from counter reducer and let's press save guess what we have done we have created three actions and we have created our store and our reducer too and I will going to show you if you go to home screen here it's very simple let's just add our new selector const and let's destruct our object equals to use selector we just need to import that use selector from react Redux import use selector from react Redux okay so now our state equals to root State we just import that from our store we have created here our root State equals to state.counter we have inside our counter we have here the Global State called value and it's a number and it's zero so let's check what we got here yes we got the value here and when we just put it inside the text for example let's here let's use a text here don't forget to import it when we put our count and press save look we have here a zero let's make it bigger look a zero here if we go to our store or to our reducer and make it like 10 it will be 10 it will be 10 in all screens because that's a global state for example if you copy that use selector and use it inside another screen like setting screen or profile screen let's for example copy that code and go to profile screen that's our profile screen just don't forget to import use selector from react from react Redux and import this root State and just add a text here with a value look we have here 10 inside profile screen we have 10 inside home screen we have 10 let's please make it bigger great isn't that and we can change it using those actions we have here an increment action a decrement action increment by amount we can use it using our dispatch hook so if you go for example in home screen and add a button with title equals to minus and let's just import our dispatch const dispatch equals to use dispatch we use use dispatch from react Redux equals to use dispatch if we just in this decrement on press if we add this function decrement we import decrement from our store counter reducer from that file because we exported here if we press save we got here a minus pattern let's make a decrement if you press here uh we forgot to add those parentheses so let's press save and try again if we press decrement look 7 6 4 and it's Global state so if you press on profile it will be four we have another action in our counter reducer called increment okay let's use it so if we just copy that button just copy that button here and use that action called increment and paste it here don't forget just to import it and let's rename that pattern to increment if we press increment look we can increase our number and here we can decrease our number here in our profile two it's 14 we can use that action too increment by amount let's use it real quick let's copy that code and paste it here let's add increment by amount and let's for example add four and let's increment by four if we press here look 18 look 22 look 26 great isn't that and you can put your Global State here in that file and that reducers like before for example let's add a value called test name and that's equal to test name if we just go to home screen and add this we got oh we didn't add typescript yet so it doesn't it doesn't appear here so let's copy it but it will work don't worry about that complaint I will fix it right now let's take a copy of that text and let's paste our test name lock test name just let's fix this typescript issue please let's go to store or counter reducer we have here complaint because in our interface we didn't add the type of that test name so let's add this and add tName and it's string okay now if you go to home screen now if we go to home screen and delete that yes we got here right now in our options just paste here and press save and any value we put here in global state it will appear in all the app for example in settings your name is Batman no it's not Batman it's test name so we can go to settings screen and const equals to use selector let's import it from react Redux state equals to root state state.counter and here this name we can replace it with that username so now it's test name now if you look here and here if we change the our name and our Global state it will get changed in all the screens for example let's change that string to make it Redux Toolkit is amazing and simple and let's press save look in home screen we have Redux Toolkit is amazing and simple and in setting screen we have the same too Redux Toolkit is amazing and simple now don't forget subscribe to watch the next lesson because in next lesson we're going to explain every line of code that I have written here and thanks for Redux Toolkit this amazing library and follow me to learn more and more thanks for watching.

</details>

#### React Redux Toolkit Tutorial For Beginners — CRUD
[Assistir no YouTube](https://www.youtube.com/watch?v=QgK_-G-hWeA)

<details>
<summary>Transcrição completa</summary>

hey guys how's it going welcome back to another video and in today's video I'm going to be going over the Redux toolkit Library as a state management solution for your applications in react this video is primarily intended for beginners so I will be taking you guys since the beginning how to install the package how to set it up in your application and go through an example of how to use it in your own web app if you're interested in checking out the code for this video it will be in the description below together with a text guide for this tutorial as well on my website called pedrotech.com. There you will find a bunch of other tutorials as well and more information related to my channel so without further ado let's get into the video.

So we're going to start off this tutorial by creating the react application that we're going to be building. I'm over here inside of an empty folder. I want to create my react project by using the command npx create vite and then we're going to use JavaScript for this tutorial so that I make this tutorial inclusive for everyone. We run npm install to install all the packages and npm run dev to start the application.

Now the only two libraries we're going to be installing is the Redux toolkit Library which is @reduxjs/toolkit and the react-redux library. Now I'll explain what each of them are but we need to install both of them.

Before we start writing anything I want to give you guys a really quick overview on what Redux toolkit is. If you're watching this video you've probably heard of Redux. It is an all-in-one State Management solution that allows you to manage very complex applications. Now Redux kind of had a decline in popularity and the reason for that was because more simple solutions like Zustand and Jotai started appearing in the market which basically allowed developers to manage their states without having to deal with all of the negative parts of Redux — the steep learning curve, requiring a lot of boilerplate code. That is exactly what Redux toolkit solves — it is an official library that simplifies Redux development making it extremely easy for you to set up and maintain.

Now what does Redux toolkit do for our app? It will help us manage States — creating a global State in an application that can be passed around and used in multiple components. In Redux toolkit we call this a store. A store is where we're going to keep the state of our app. We're going to need to create that store somewhere in our app — it's recommended that you create a file called store.js.

Inside of here we're going to create our store by importing from @reduxjs/toolkit the function configureStore. We export a constant called store and set it equal to configureStore. This configureStore object requires a reducer as a prop.

What is a reducer in Redux toolkit? Reducers are functions that specify how the state of your application should change in response to an action. A reducer takes in two arguments: the state (the current state that specific reducer manages) and an action (an object describing what happened in your application, which might include a payload with data).

To write all of the functions that we're going to handle in our app Redux toolkit allows us to separate them by creating what is known as a slice. We create a file called movieSlice.js. Inside of here we create a slice using createSlice from @reduxjs/toolkit. The slice has a name ('movies'), an initialState (an object with a movies array), and reducers (functions defining how state changes).

The first reducer is addMovie — when called, state.movies.push(action.payload). This pushes a new movie to the end of the movies list. The second reducer is removeMovie — it filters the movies list to exclude the movie with the matching ID from the payload.

We export the actions with const { addMovie, removeMovie } = movieSlice.actions and export default movieSlice.reducer. This reducer is then passed to the store in store.js as movies: movieReducer.

To tell our app about the Redux store we wrap our root component with the Provider component from react-redux, passing the store as a prop. This allows our whole app to have access to the Redux state.

In the MovieList component we use the useSelector hook from react-redux to get data from the state. We say const movies = useSelector(state => state.movies.movies). The use selector hook allows you to access any part of your global state. Then we map over movies and display each one.

In the MovieInput component we use the useDispatch hook to get a dispatch function. When the user clicks Add Movie we call dispatch(addMovie(newMovieString)). Inside the addMovie reducer we create a new movie object with an auto-incremented ID and the name from the payload, then push it to state.movies.

For delete we add a button next to each movie that calls dispatch(removeMovie(movie.id)). The removeMovie reducer filters out the movie with that ID.

The pattern is always the same: to access state you use useSelector, to change state you use useDispatch and dispatch an action. You always have a slice that looks similar to this, you always have this one store that you pass them into, and every time you want to access or change the state you use the same two hooks.

That's basically it for today's tutorial. Today we've learned the basics of Redux toolkit including setting up the store, creating slices, and dispatching actions to update your state. With Redux toolkit you can manage your react app very easily in a very simple and clean way. If you enjoyed the video please make sure to like, subscribe and share it with anyone who might also find it useful. Thank you so much for watching and I see you guys next time.

</details>

### Artigos e Docs
- [How to Handle State Management in React Native — OneUptime (2026)](https://oneuptime.com/blog/post/2026-02-02-react-native-state-management/view)
- [Zustand + TanStack Query: RN Guide 2026 — React Native Relay](https://reactnativerelay.com/article/modern-state-management-react-native-zustand-tanstack-query)
- [From Basics to Pro: Mastering Zustand in React Native — Medium](https://medium.com/@harshitmadhav/from-basics-to-pro-mastering-zustand-in-react-native-7f372464d984)
- [State Management Showdown: Redux vs Context vs Zustand — Java Code Geeks](https://www.javacodegeeks.com/2025/09/react-state-management-showdown-redux-vs-context-api-vs-zustand.html)
- [How to Persist State with AsyncStorage and MMKV — OneUptime](https://oneuptime.com/blog/post/2026-01-15-react-native-asyncstorage-mmkv/view)
- [TanStack Query para React Native — Documentação oficial](https://tanstack.com/query/v5/docs/framework/react/react-native)
- [Replace AsyncStorage with MMKV — DEV.to](https://dev.to/ajmal_hasan/react-native-mmkv-5787)
- [react-native-mmkv — GitHub](https://github.com/mrousavy/react-native-mmkv)
