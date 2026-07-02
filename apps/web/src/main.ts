import { createPinia } from "pinia";
import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import "./design-system/tokens.css";
import "./design-system/enterprise.css";
import "./styles.css";

const app = createApp(App).use(createPinia()).use(router);

void router.isReady().then(() => {
  app.mount("#app");
});
