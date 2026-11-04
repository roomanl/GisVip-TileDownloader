import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router";
import App from "./App.vue";
import "./assets/index.css";

import initApp from '@/lib/initApp'

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(initApp);
app.mount("#app");


