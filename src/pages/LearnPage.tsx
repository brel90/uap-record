import { useNavigate } from 'react-router-dom'
import './learn.css'
import { MODULES } from '@/data/modules'

export default function LearnPage() {
  const navigate = useNavigate()

  return (
    <div className="learn-root">
      <div className="learn-wrap">
        <div className="learn-col">

          {/* Header */}
          <div className="learn-logo">UAP Record</div>
          <h1 className="learn-title">Learn</h1>
          <hr className="learn-rule" />

          {/* Intro */}
          <div className="learn-intro">
            <p>The history of the UAP phenomenon is not a collection of strange stories.<br />
            It is a documented record — government files, military testimony, congressional<br />
            hearings, declassified programs — that has been available for decades.</p>
            <p>Most people never saw it. That wasn't an accident.</p>
            <p>Three modules. Eight stations each. Built from primary sources.</p>
          </div>
          <hr className="learn-rule" />

          {/* Module cards */}
          <div className="learn-modules">
            {MODULES.map((mod, i) => (
              <button
                key={mod.id}
                className="learn-module-card"
                onClick={() => navigate(`/learn/${mod.id}`)}
              >
                <div className="learn-card-body">
                  <div className="learn-card-num">
                    {String(i + 1).padStart(2, '0')} — {mod.title.toUpperCase()}
                  </div>
                  <div className="learn-card-title">{mod.title}</div>
                  <p className="learn-card-desc">{mod.description}</p>
                </div>
                <div className="learn-card-arrow">Begin →</div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <p className="learn-footer-text">
            Start anywhere. The truth doesn't require a sequence.<br />
            But if you want to understand it fully — start at the beginning.
          </p>

        </div>
      </div>
    </div>
  )
}
