# Tópico 5 — Estado Global & APIs (Trilha 2: Devs Web/React)

> **Perfil:** Devs com background React web. Já conhecem Redux, Context API e React Query na web. O foco aqui é entender as adaptações necessárias para o contexto mobile: offline-first, persistência local, comportamento sem browser cache e particularidades da rede móvel.

---

## Objetivo do tópico

Ao final, o dev deve conseguir:
- Reaproveitar o conhecimento de Zustand/Redux da web no contexto mobile
- Configurar TanStack Query com comportamentos mobile-first (revalidação por foco de tela)
- Persistir estado com MMKV (não com `localStorage`)
- Entender o padrão offline-first para apps mobile
- Adaptar padrões de Context API para o modelo mobile

---

## O que muda da web para o mobile

| Web | Mobile (React Native) | Por quê muda |
|-----|----------------------|-------------|
| `localStorage` | MMKV / AsyncStorage | Não existe `window.localStorage` |
| `sessionStorage` | Estado em memória (Zustand sem persist) | Sem conceito de sessão de aba |
| Cache do browser | TanStack Query cache explícito | Sem cache HTTP automático do browser |
| Conexão estável | Rede instável, offline frequente | Apps mobile precisam de offline-first |
| Foco de página (`visibilitychange`) | Foco de tela (`useFocusEffect`) | Eventos de foco são por tela, não por aba |
| `window.navigator.onLine` | `@react-native-community/netinfo` | API diferente para detectar conectividade |

---

## Estado local: sem mudanças

`useState` e `useReducer` funcionam exatamente igual à web — nenhuma adaptação necessária.

```tsx
const [count, setCount] = useState(0);
const [form, setForm] = useReducer(formReducer, initialFormState);
```

---

## Context API: use para estado simples e raramente mutável

A Context API funciona igual à web, mas atenção para re-renders em mobile — evite para estado que muda com frequência (ex: lista de produtos). Use para:
- Tema (dark/light)
- Idioma (i18n)
- Sessão de autenticação

```tsx
// Padrão Context + useReducer para auth
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, { user: null, token: null });

  return (
    <AuthContext.Provider value={{ ...state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
};
```

---

## Zustand: recomendado para estado global (mesma API da web)

```bash
npm install zustand
npm install react-native-mmkv react-native-nitro-modules
```

```tsx
// stores/useCartStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// MMKV como storage (substitui localStorage)
import { MMKV } from 'react-native-mmkv';
const mmkv = new MMKV();

const zustandStorage = {
  setItem: (name: string, value: string) => mmkv.set(name, value),
  getItem: (name: string) => mmkv.getString(name) ?? null,
  removeItem: (name: string) => mmkv.delete(name),
};

type CartStore = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => set({ items: [...get().items, item] }),
      removeItem: (id) => set({ items: get().items.filter(i => i.id !== id) }),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
```

> **Diferença da web:** troque `localStorage` por MMKV como backend do `persist`. O resto da API do Zustand é idêntico.

---

## MMKV: substituto do localStorage

```bash
npm install react-native-mmkv react-native-nitro-modules
cd ios && pod install
```

```tsx
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

// API síncrona — sem async/await (diferente do AsyncStorage)
storage.set('token', 'abc123');
storage.set('user', JSON.stringify({ id: 1, name: 'João' }));

const token = storage.getString('token');
const user = JSON.parse(storage.getString('user') ?? 'null');
storage.delete('token');
```

### AsyncStorage vs MMKV

| | AsyncStorage | MMKV |
|--|-------------|------|
| Velocidade | Padrão | 30x mais rápido |
| API | Async (Promise) | Síncrona |
| Criptografia | Não | AES-128/256 embutido |
| Uso ideal | Projetos simples / legado | Produção — qualquer tamanho |

---

## TanStack Query: adaptações mobile-first

```bash
npm install @tanstack/react-query
```

### Configuração com revalidação por foco de tela

```tsx
// App.tsx
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { AppState } from 'react-native';

// Revalidar queries quando o app volta ao primeiro plano
AppState.addEventListener('change', (status) => {
  focusManager.setFocused(status === 'active');
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
      // No mobile, não refazer fetch ao focar a "janela" (sem tabs)
      refetchOnWindowFocus: false,
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

### Revalidar ao focar a tela (equivalente ao refetchOnWindowFocus da web)

```tsx
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';

export function useProducts() {
  const query = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });

  // Refaz fetch toda vez que a tela recebe foco
  useFocusEffect(
    useCallback(() => {
      query.refetch();
    }, [query.refetch])
  );

  return query;
}
```

### Mutations com invalidação de cache

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useAddProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NewProduct) =>
      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
```

---

## Offline-first: padrão importante no mobile

Diferente da web, apps mobile devem funcionar sem conexão. A camada de persistência do TanStack Query + MMKV viabiliza isso:

```tsx
// Detectar conectividade
import NetInfo from '@react-native-community/netinfo';

// Pausar queries quando offline
import { onlineManager } from '@tanstack/react-query';

NetInfo.addEventListener(state => {
  onlineManager.setOnline(state.isConnected ?? true);
});
```

```tsx
// Arquitetura offline-first
// 1. Tela carrega dados do cache local (MMKV) imediatamente
// 2. TanStack Query faz fetch em background
// 3. Se offline, usa cache sem erro

const { data, isLoading, isFetching } = useQuery({
  queryKey: ['products'],
  queryFn: fetchProducts,
  // Dados do cache são usados enquanto refetch ocorre em background
  staleTime: 5 * 60 * 1000,
  gcTime: 24 * 60 * 60 * 1000, // manter cache por 24h
});
```

---

## Arquitetura recomendada

```
src/
├── stores/          # Zustand: UI state, auth, preferências
│   ├── useAuthStore.ts
│   └── useThemeStore.ts
├── hooks/           # TanStack Query: dados do servidor
│   ├── useProducts.ts
│   └── useUser.ts
├── services/        # Funções de fetch (sem lógica React)
│   ├── api.ts
│   └── endpoints/
│       ├── products.ts
│       └── users.ts
└── lib/
    └── storage.ts   # MMKV singleton
```

---

## Exercício prático

1. Migre uma store Zustand da web para mobile, trocando `localStorage` por MMKV
2. Configure TanStack Query com `focusManager` para revalidar quando o app volta ao primeiro plano
3. Implemente `useFocusEffect` para refazer fetch ao navegar de volta para uma tela
4. Adicione detecção de conectividade com `onlineManager` do TanStack Query
5. Teste o comportamento offline: carregue dados, desligue o Wi-Fi e navegue

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
- [Zustand + TanStack Query: RN Guide 2026 — React Native Relay](https://reactnativerelay.com/article/modern-state-management-react-native-zustand-tanstack-query)
- [State Management in React 2026: Redux, Context & Zustand — Zignuts](https://www.zignuts.com/blog/react-state-management-2025)
- [How to Handle State Management in React Native — OneUptime](https://oneuptime.com/blog/post/2026-02-02-react-native-state-management/view)
- [How to Persist State with AsyncStorage and MMKV — OneUptime](https://oneuptime.com/blog/post/2026-01-15-react-native-asyncstorage-mmkv/view)
- [Offline-First Architecture in React Native — OneUptime](https://oneuptime.com/blog/post/2026-01-15-react-native-offline-architecture/view)
- [TanStack Query para React Native — Documentação oficial](https://tanstack.com/query/v5/docs/framework/react/react-native)
- [Mastering Zustand in React Native — DEV Community](https://dev.to/james_mugambi_494c7da2b07/mastering-state-management-in-react-native-with-zustand-a-modern-guide-1bfd)
- [MMKV vs AsyncStorage in React Native](https://reactnativeexpert.com/blog/mmkv-vs-asyncstorage-in-react-native/)
- [react-native-mmkv — GitHub](https://github.com/mrousavy/react-native-mmkv)
