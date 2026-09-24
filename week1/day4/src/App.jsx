import { DataProvider } from "./contexts/DataContext.jsx";
import { Dashboard } from "./components/Dashboard.jsx";
import "./App.css";

function App() {
  return (
    <DataProvider>
      <Dashboard />
    </DataProvider>
  );
}

export default App;
