import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import Timeline from './pages/Timeline.tsx'
import MapView from './pages/MapView.tsx'
import Graph from './pages/Graph.tsx'
import Search from './pages/Search.tsx'
import EventDetail from './pages/EventDetail.tsx'
import EntityDetailPage from './pages/EntityDetailPage.tsx'
import AboutPage from './pages/AboutPage.tsx'
import LearnPage from './pages/LearnPage.tsx'
import ModulePage from './components/learn/ModulePage.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<Timeline />} />
            <Route path="map" element={<MapView />} />
            <Route path="graph" element={<Graph />} />
            <Route path="search" element={<Search />} />
            <Route path="event/:slug" element={<EventDetail />} />
            <Route path="entity/:id" element={<EntityDetailPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="learn" element={<LearnPage />} />
            <Route path="learn/:moduleId" element={<ModulePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
