import { useEffect, useMemo, useState } from 'react'
import { FaEdit, FaSave, FaTimes, FaTrashAlt } from 'react-icons/fa'

const DEFAULT_FIELDS = [
  { key: 'fullName', label: 'Full Name', editable: true },
  { key: 'username', label: 'Username', editable: false },
  { key: 'uniqueID', label: 'Unique Code', editable: false },
  { key: 'mobileNo', label: 'Mobile Number', editable: true },
  { key: 'region', label: 'Region / Address', editable: true },
  { key: 'district', label: 'District', editable: true },
  { key: 'state', label: 'State', editable: true },
]

const ROLE_LABELS = {
  BENEFICIARY: "Beneficiary's account",
  BENEFICIARY_ACCOUNT: "Beneficiary's account",
  FIELD_OFFICER: "Field Officer's account",
  OFFICER: "Field Officer's account",
  FINANCE_OFFICER: "Finance Officer's account",
  ADMIN: "Admin's account",
}

function formatAccountLabel(role) {
  const normalized = String(role || '').trim().toUpperCase()
  if (ROLE_LABELS[normalized]) return ROLE_LABELS[normalized]
  if (!normalized) return 'Account'
  return `${normalized.replace(/_/g, ' ')} account`
}

function getProfileValue(profile, key) {
  if (!profile) return ''
  if (key === 'uniqueID') {
    return profile.uniqueID || profile.uniqueId || profile.id || ''
  }
  return profile[key] ?? ''
}

function buildDraft(profile) {
  return {
    fullName: getProfileValue(profile, 'fullName'),
    username: getProfileValue(profile, 'username'),
    uniqueID: getProfileValue(profile, 'uniqueID'),
    mobileNo: getProfileValue(profile, 'mobileNo'),
    region: getProfileValue(profile, 'region'),
    district: getProfileValue(profile, 'district'),
    state: getProfileValue(profile, 'state'),
  }
}

export default function ProfilePanel({
  profile,
  role,
  title = 'Profile Management',
  subtitle,
  editable = false,
  deletable = false,
  onSave,
  onDelete,
  fields = DEFAULT_FIELDS,
  editLabel = 'Edit Profile',
  saveLabel = 'Save Changes',
  cancelLabel = 'Cancel',
  deleteLabel = 'Delete Account',
}) {
  const [draft, setDraft] = useState(() => buildDraft(profile))
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setDraft(buildDraft(profile))
    setIsEditing(false)
    setIsSaving(false)
    setError('')
  }, [profile])

  const accountLabel = useMemo(() => formatAccountLabel(role || profile?.role), [role, profile?.role])
  const avatarLetter = useMemo(() => {
    const source = profile?.fullName || profile?.username || accountLabel || 'A'
    return source.trim().charAt(0).toUpperCase() || 'A'
  }, [accountLabel, profile?.fullName, profile?.username])
  const subtitleText = subtitle || `Manage your ${accountLabel.toLowerCase()} details.`

  const showEditor = editable && typeof onSave === 'function'

  const handleChange = (key) => (event) => {
    const nextValue = key === 'mobileNo'
      ? event.target.value.replace(/\D/g, '').slice(0, 10)
      : event.target.value

    setDraft((prev) => ({ ...prev, [key]: nextValue }))
    if (error) setError('')
  }

  const handleCancel = () => {
    setDraft(buildDraft(profile))
    setIsEditing(false)
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!showEditor || !isEditing) return

    try {
      setIsSaving(true)
      await onSave({ ...profile, ...draft })
      setIsEditing(false)
      setError('')
    } catch (err) {
      setError(err?.message || 'Failed to save profile changes.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <div className="pane-header">
        <h2>{title}</h2>
        <p>{subtitleText}</p>
      </div>

      <div className="profile-container">
        <div className="profile-sidebar">
          <div className="profile-avatar-card">
            <div className="avatar-circle">
              {avatarLetter}
            </div>
            <h3>{profile?.fullName || 'Account Holder'}</h3>
            <p>{profile?.username ? `@${profile.username}` : profile?.email || 'Profile information'}</p>
            <span className="profile-occup-badge">{accountLabel}</span>
          </div>

          {deletable && onDelete && (
            <div className="profile-actions-panel">
              <button type="button" onClick={onDelete} className="btn-danger-outline">
                <FaTrashAlt style={{ marginRight: '6px' }} />
                {deleteLabel}
              </button>
            </div>
          )}
        </div>

        <div className="profile-form-card">
          <div className="card-title-bar">
            <h3>Profile Information</h3>
            {showEditor && !isEditing && (
              <button type="button" onClick={() => setIsEditing(true)} className="btn-edit-toggle">
                <FaEdit style={{ marginRight: '6px' }} />
                {editLabel}
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-grid">
              {fields.map((field) => {
                const value = getProfileValue(draft, field.key)
                const canModify = showEditor && isEditing && field.editable !== false
                const hasValue = Boolean(value)

                return (
                  <div className="form-group" key={field.key}>
                    <label htmlFor={`profile-${field.key}`}>
                      {field.label}
                    </label>
                    <input
                      id={`profile-${field.key}`}
                      type="text"
                      value={value || (canModify ? '' : 'Not provided')}
                      readOnly={!canModify}
                      onChange={canModify ? handleChange(field.key) : undefined}
                      className={`profile-field-input ${
                        canModify
                          ? hasValue ? 'profile-field-input--filled' : ''
                          : hasValue ? 'profile-field-input--filled' : 'profile-field-input--missing'
                      }`}
                    />
                  </div>
                )
              })}
            </div>

            {showEditor && isEditing && (
              <div className="form-actions">
                <button type="button" className="button button--ghost" onClick={handleCancel} disabled={isSaving}>
                  <FaTimes style={{ marginRight: '6px' }} />
                  {cancelLabel}
                </button>
                <button type="submit" className="button button--primary" disabled={isSaving}>
                  <FaSave style={{ marginRight: '6px' }} />
                  {isSaving ? 'Saving...' : saveLabel}
                </button>
              </div>
            )}

            {error && (
              <p style={{ margin: '1rem 0 0', color: '#ef4444', fontSize: '0.9rem', fontWeight: 600 }}>
                {error}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
