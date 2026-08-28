import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as Icon from 'lucide-react';
import '../styles/AdminLayout.css';
import logo from '../assets/icons/logo.png';

export default function AdminLayout({
  children,
  activeTab,
  onTabChange,
  userName,
  userRole,
  onLogout,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // ---------------------------------------------------------
  // Navigation Handler
  // ---------------------------------------------------------
  const handleNavigation = (tabKey, route = null) => {
    // If the item has its own route, navigate to that route.
    if (route) {
      navigate(route);
      return;
    }

    // For tab-based pages
    if (onTabChange) {
      if (location.pathname !== '/admin/dashboard') {
        navigate('/admin/dashboard', {
          state: {
            tab: tabKey,
          },
        });
      } else {
        onTabChange(tabKey);
      }
    }
  };

  // ---------------------------------------------------------
  // Main Navigation
  // ---------------------------------------------------------
  const navItems = [
    {
      key: 'analytics',
      label: 'Analytics Dashboard',
      icon: Icon.LayoutDashboard,
      route: '/analytics',
    },
    {
      key: 'allocation',
      label: 'Application Allocation',
      icon: Icon.FileText,
      route: null,
    },
    {
      key: 'schemes',
      label: 'Manage Schemes',
      icon: Icon.Settings,
      route: null,
    },
    {
      key: 'officers',
      label: 'Officer Tracker',
      icon: Icon.Users,
      route: null,
    },
  ];

  // ---------------------------------------------------------
  // Quick Actions
  // ---------------------------------------------------------
  const quickActions = [
    {
      key: 'officer-requests',
      label: 'Officer Requests',
      icon: Icon.UserPlus,
      route: null,
    },
    {
      key: 'action-logs',
      label: 'Action Logs',
      icon: Icon.Activity,
      route: null,
    },
    {
      key: 'queries',
      label: 'Citizen Queries',
      icon: Icon.MessageSquare,
      route: null,
    },
    {
      key: 'profile',
      label: 'Profile Settings',
      icon: Icon.User,
      route: null,
    },
  ];

  // ---------------------------------------------------------
  // Generate User Initials
  // ---------------------------------------------------------
  const getInitials = (name) => {
    if (!name || typeof name !== 'string') {
      return 'A';
    }

    const parts = name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 0) {
      return 'A';
    }

    return parts
      .map((part) => part.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const initials = getInitials(userName);

  // ---------------------------------------------------------
  // Check Active Navigation Item
  // ---------------------------------------------------------
  const isItemActive = (item) => {
    // Route-based navigation
    if (item.route) {
      return location.pathname === item.route;
    }

    // Tab-based navigation
    return activeTab === item.key;
  };

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------
  return (
    <div className="admin-shell" data-theme="light">

      {/* =====================================================
          SIDEBAR
      ====================================================== */}
      <aside
        className="admin-sidebar"
        role="navigation"
        aria-label="Admin navigation"
      >

        {/* ---------------------------------------------------
            BRAND
        ---------------------------------------------------- */}
        <div className="admin-sidebar__header">

          <img
            src={logo}
            alt="GS GOV SUBSIDY emblem"
            className="admin-sidebar__logo"
          />

          <div className="admin-sidebar__brand">

            <span className="admin-sidebar__brand-name">
              GS GOV SUBSIDY
            </span>

            <span className="admin-sidebar__brand-sub">
              Admin Portal
            </span>

          </div>

        </div>


        {/* ---------------------------------------------------
            NAVIGATION
        ---------------------------------------------------- */}
        <nav className="admin-sidebar__nav">

          {/* MAIN NAVIGATION */}
          <div className="admin-sidebar__section">

            {navItems.map((item) => {
              const ItemIcon = item.icon;
              const active = isItemActive(item);

              return (
                <button
                  key={item.key}
                  type="button"
                  className={`admin-sidebar__nav-item ${active ? 'active' : ''
                    }`}
                  onClick={() =>
                    handleNavigation(item.key, item.route)
                  }
                  aria-current={active ? 'page' : undefined}
                >

                  <span className="admin-sidebar__nav-icon">
                    <ItemIcon
                      size={19}
                      strokeWidth={1.9}
                    />
                  </span>

                  <span className="admin-sidebar__nav-label">
                    {item.label}
                  </span>

                </button>
              );
            })}

          </div>


          {/* -------------------------------------------------
              QUICK ACTIONS TITLE
          -------------------------------------------------- */}
          <div className="admin-sidebar__nav-title">
            Quick Actions
          </div>


          {/* QUICK ACTIONS */}
          <div className="admin-sidebar__section">

            {quickActions.map((item) => {
              const ItemIcon = item.icon;
              const active = isItemActive(item);

              return (
                <button
                  key={item.key}
                  type="button"
                  className={`admin-sidebar__nav-item ${active ? 'active' : ''
                    }`}
                  onClick={() =>
                    handleNavigation(item.key, item.route)
                  }
                  aria-current={active ? 'page' : undefined}
                >

                  <span className="admin-sidebar__nav-icon">
                    <ItemIcon
                      size={19}
                      strokeWidth={1.9}
                    />
                  </span>

                  <span className="admin-sidebar__nav-label">
                    {item.label}
                  </span>

                </button>
              );
            })}

          </div>

        </nav>


        {/* ---------------------------------------------------
            SIDEBAR SECURITY CARD
        ---------------------------------------------------- */}
        <div className="admin-sidebar__bottom">

          <div className="admin-secure-badge">

            <div className="admin-secure-badge__icon">
              <Icon.ShieldCheck
                size={20}
                strokeWidth={1.8}
              />
            </div>

            <div className="admin-secure-badge__content">

              <h4>
                Admin Security
              </h4>

              <p>
                Platform monitoring and access logs are active.
              </p>

            </div>

          </div>

        </div>

      </aside>


      {/* =====================================================
          MAIN APPLICATION
      ====================================================== */}
      <div className="admin-main-wrapper">

        {/* ===================================================
            HEADER
        ==================================================== */}
        <header className="admin-header">

          {/* -------------------------------------------------
              SEARCH
          -------------------------------------------------- */}
          <div className="admin-header__search">

            <Icon.Search
              size={19}
              strokeWidth={1.8}
              aria-hidden="true"
            />

            <input
              type="search"
              placeholder="Search schemes, officers, or logs..."
              aria-label="Search schemes, officers, or logs"
            />

            <span
              className="admin-header__search-shortcut"
              aria-hidden="true"
            >
              ⌘K
            </span>

          </div>


          {/* -------------------------------------------------
              HEADER ACTIONS
          -------------------------------------------------- */}
          <div className="admin-header__actions">

            {/* Notifications */}
            <button
              type="button"
              className="admin-header__icon-btn"
              aria-label="Notifications"
            >
              <Icon.Bell
                size={18}
                strokeWidth={1.8}
              />
            </button>


            {/* Messages */}
            <button
              type="button"
              className="admin-header__icon-btn"
              aria-label="Messages"
            >
              <Icon.Mail
                size={18}
                strokeWidth={1.8}
              />
            </button>


            {/* ------------------------------------------------
                USER PROFILE
            ------------------------------------------------- */}
            <button
              type="button"
              className="admin-header__profile"
              aria-label={`Open profile for ${userName || 'Administrator'
                }`}
            >

              {/* Avatar */}
              <div className="admin-header__avatar">
                {initials}
              </div>


              {/* User Information */}
              <div className="admin-header__profile-text">

                <span className="admin-header__profile-name">
                  {userName || 'Administrator'}
                </span>

                <span className="admin-header__profile-role">
                  {userRole || 'Admin Portal'}
                </span>

              </div>


              {/* Dropdown Icon */}
              <Icon.ChevronDown
                size={15}
                strokeWidth={1.8}
                className="admin-header__profile-chevron"
              />

            </button>

          </div>

        </header>


        {/* ===================================================
            MAIN CONTENT
        ==================================================== */}
        <main className="admin-content">
          {children}
        </main>

      </div>

    </div>
  );
}