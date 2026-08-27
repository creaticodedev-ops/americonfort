import React from 'react'

/** Shared public section heading — same language everywhere. */
const Title = ({ title, subTitle, align, eyebrow }) => {
  const centered = align !== 'left'

  return (
    <header className={`ac-head${centered ? ' ac-head--center' : ''}`}>
      {eyebrow ? <p className="ac-eyebrow">{eyebrow}</p> : null}
      <h2 className="ac-title">{title}</h2>
      {subTitle ? <p className="ac-lede">{subTitle}</p> : null}
    </header>
  )
}

export default Title
