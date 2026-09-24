import { DataManager } from "./DataManager.js";

(async () => {
  const dm = new DataManager("https://jsonplaceholder.typicode.com");
  const logSubscribers = dm.subscribe((endpoint, data) => {
    console.log(`Update ${endpoint} has this ${JSON.stringify(data)}`);
  });
   await dm.fetchData("/posts");
})();
