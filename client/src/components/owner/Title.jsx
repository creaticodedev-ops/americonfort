import React from 'react'
import { PageHeader } from './ui'

/** Back-compat title wrapper → PageHeader design system */
const Title = ({ title, subTitle, actions, breadcrumbs }) => (
  <PageHeader title={title} description={subTitle} actions={actions} breadcrumbs={breadcrumbs} className="mb-0" />
)

export default Title
