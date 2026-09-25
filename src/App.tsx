import { NavLink, Route, Routes } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { ProjectCost } from './pages/ProjectCost'
import { Calculator } from './pages/Calculator'
import { Empty } from './components/Bits'

function Soon({ title, what }: { title: string; what: string }) {
  return (
    <Empty title={title}>
      <p>{what}</p>
      <p className="small">Not built yet — this route exists so the shell is complete.</p>
    </Empty>
  )
}

export default function App() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          Project W<span>Sitapur water venture</span>
        </div>

        <nav className="navgroup">
          <h4>Overview</h4>
          <NavLink to="/" end className={({ isActive }) => 'navlink' + (isActive ? ' active' : '')}>
            Dashboard
          </NavLink>
        </nav>

        <nav className="navgroup">
          <h4>Calculators</h4>
          <NavLink to="/calculator" className={({ isActive }) => 'navlink' + (isActive ? ' active' : '')}>
            One-page calculator
          </NavLink>
          <NavLink to="/project-cost" className={({ isActive }) => 'navlink' + (isActive ? ' active' : '')}>
            Project cost (tables)
          </NavLink>
          <NavLink to="/unit-economics" className={({ isActive }) => 'navlink' + (isActive ? ' active' : '')}>
            Unit economics
          </NavLink>
          <NavLink to="/compare" className={({ isActive }) => 'navlink' + (isActive ? ' active' : '')}>
            Compare scenarios
          </NavLink>
        </nav>

        <nav className="navgroup">
          <h4>Research</h4>
          <NavLink to="/machines" className={({ isActive }) => 'navlink' + (isActive ? ' active' : '')}>
            Machine comparison
          </NavLink>
          <NavLink to="/research" className={({ isActive }) => 'navlink' + (isActive ? ' active' : '')}>
            Research index
          </NavLink>
        </nav>

        <div style={{ marginTop: 'auto' }} className="small muted">
          Local only. Data lives in this browser — export a backup regularly.
        </div>
      </aside>

      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/project-cost" element={<ProjectCost />} />
          <Route
            path="/unit-economics"
            element={
              <Soon
                title="Unit economics"
                what="A per-bottle view across SKUs with sensitivity on preform weight, freight distance and price."
              />
            }
          />
          <Route
            path="/compare"
            element={
              <Soon
                title="Compare scenarios"
                what="Two or three scenarios side by side on cost, funding, margin and break-even."
              />
            }
          />
          <Route
            path="/machines"
            element={
              <Soon
                title="Machine comparison"
                what="One row per vendor quote — BPM, price, load, warranty split, SS grade evidence, references called."
              />
            }
          />
          <Route
            path="/research"
            element={
              <Soon
                title="Research index"
                what="The thirteen research documents as structured, filterable records rather than long markdown."
              />
            }
          />
          <Route path="*" element={<Soon title="Not found" what="That route does not exist." />} />
        </Routes>
      </main>
    </div>
  )
}
