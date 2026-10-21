import React, { useState, useEffect, useRef, useId } from 'react';
import { Search, Users, Trash2, ChevronDown, Link2, Copy, Check, Clock, X, Crown, Eye, MessageSquare, Pencil, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usersApi, sharesApi, boardsApi } from '../../services/api';
import { ClassroomDialog, ClassroomAlert, ClassroomButton, ClassroomField, ChalkBadge } from '../classroom';

// Static lookup maps: Tailwind only sees literal class names. Permission is always label plus icon.
const PERMISSION_BADGE = {
  owner: { label: 'Owner', icon: Crown },
  edit: { label: 'Editor', icon: Pencil },
  comment: { label: 'Commenter', icon: MessageSquare },
  view: { label: 'Viewer', icon: Eye },
};

// Unknown permissions read as Viewer, as before.
function permissionBadge(permission) {
  return PERMISSION_BADGE[permission] || PERMISSION_BADGE.view;
}

// Icon-only controls sit inside a relative wrapper that holds only the control, so centring uses top-1/2.
const ICON_CENTRED = 'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3';

// 44 px on phones, 32 px on desktop.
const ICON_BTN = 'btn-motion flex h-11 w-11 flex-shrink-0 items-center justify-center rounded text-ink-2 md:h-8 md:w-8';

const TABS = [
  { id: 'members', label: 'Members', icon: Users },
  { id: 'invite', label: 'Invite Links', icon: Link2 },
];

export default function ShareModal({ isOpen, onClose, boardId, boardName }) {
  const { user } = useAuth();
  const uid = useId();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedPermission, setSelectedPermission] = useState('view');
  const [showPermDropdown, setShowPermDropdown] = useState(null);
  const [activeTab, setActiveTab] = useState('members');
  const [inviteLinks, setInviteLinks] = useState([]);
  const [invitePermission, setInvitePermission] = useState('view');
  const [inviteExpiry, setInviteExpiry] = useState('');
  const [inviteMaxUses, setInviteMaxUses] = useState('');
  const [copiedLink, setCopiedLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    if (isOpen && boardId) {
      loadMembers();
      loadInviteLinks();
    }
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [isOpen, boardId]);

  const loadMembers = async () => {
    try {
      const response = await boardsApi.get(boardId);
      const board = response.data;
      const membersList = [
        {
          id: 'owner',
          user: {
            id: board.owner_details?.id || board.owner,
            name: board.owner_details ? `${board.owner_details.username}` : board.owner_name,
            email: board.owner_details?.email || '',
          },
          permission: 'owner',
        },
        ...(board.collaborators || []).map(c => ({
          id: c.id,
          user: {
            id: c.user_details?.id || c.user,
            name: c.user_details?.username || c.username,
            email: c.user_details?.email || '',
          },
          permission: c.permission,
        })),
      ];
      setMembers(membersList);
    } catch (err) {
      console.error('Failed to load members:', err);
      // Fallback: show current user as owner
      setMembers([{
        id: 'owner',
        user: { id: user?.id, name: user?.username || 'You', email: user?.email || '' },
        permission: 'owner',
      }]);
    }
  };

  const loadInviteLinks = async () => {
    try {
      const response = await boardsApi.getInvites(boardId);
      setInviteLinks(response.data);
    } catch {
      // Owner-only, may fail for non-owners
    }
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    // Debounce search
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await usersApi.search(searchQuery);
        const results = (response.data.results || response.data).filter(
          u => u.id !== user?.id && !members.some(m => m.user.id === u.id)
        );
        setSearchResults(results);
      } catch (err) {
        console.error('Search failed:', err);
        setSearchResults([]);
      }
    }, 300);
  }, [searchQuery, user, members]);

  const handleAddMember = async (targetUser) => {
    setError(null);
    setSuccess(null);
    try {
      const response = await sharesApi.create({
        board: boardId,
        user: targetUser.id,
        permission: selectedPermission,
      });
      const share = response.data;
      const newMember = {
        id: share.id,
        user: {
          id: targetUser.id,
          name: targetUser.username || `${targetUser.first_name} ${targetUser.last_name}`,
          email: targetUser.email_hint || targetUser.email || '',
        },
        permission: selectedPermission,
      };
      setMembers(prev => [...prev, newMember]);
      setSearchQuery('');
      setSearchResults([]);
      const displayName = targetUser.first_name ? `${targetUser.first_name} ${targetUser.last_name}` : targetUser.username;
      const permLabel = permissionBadge(selectedPermission).label;
      setSuccess(`${displayName} added as ${permLabel}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to add member:', err);
      const message = err.response?.data?.detail || err.response?.data?.error || 'Failed to add member. Please try again.';
      setError(message);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      await sharesApi.remove(memberId);
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const handleChangePermission = async (memberId, newPermission) => {
    try {
      await sharesApi.update(memberId, { permission: newPermission });
      setMembers(prev => prev.map(m =>
        m.id === memberId ? { ...m, permission: newPermission } : m
      ));
      setShowPermDropdown(null);
    } catch (err) {
      console.error('Failed to update permission:', err);
    }
  };

  const handleCreateInvite = async () => {
    setLoading(true);
    try {
      const response = await boardsApi.createInvite(boardId, {
        permission: invitePermission,
        expires_in: inviteExpiry || null,
        max_uses: inviteMaxUses || null,
      });
      setInviteLinks(prev => [response.data, ...prev]);
    } catch (err) {
      console.error('Failed to create invite:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeInvite = async (inviteId) => {
    try {
      await boardsApi.revokeInvite(boardId, { invite_id: inviteId });
      setInviteLinks(prev => prev.filter(l => l.id !== inviteId));
    } catch (err) {
      console.error('Failed to revoke invite:', err);
    }
  };

  const copyInviteLink = (token) => {
    const link = `${window.location.origin}/join/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(token);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Arrow keys move between the two tabs (roving tabindex), as the tab pattern asks.
  const onTabKeyDown = (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next = activeTab === 'members' ? 'invite' : 'members';
    setActiveTab(next);
    const target = document.getElementById(`${uid}_tab_${next}`);
    if (target) target.focus();
  };

  if (!isOpen) return null;

  const isOwner = members.find(m => m.permission === 'owner')?.user.id === user?.id;

  const footer = (
    <ClassroomButton variant="primary" className="w-full sm:w-auto" onClick={onClose}>
      Done
    </ClassroomButton>
  );

  return (
    <ClassroomDialog
      titleId={`${uid}-title`}
      title="Share Board"
      subtitle={boardName}
      onClose={onClose}
      size="md"
      bodyFlush
      dismissOnScrim
      footer={footer}
    >
      {isOwner && (
        <div role="tablist" aria-label="Share sections" className="flex border-b border-line">
          {TABS.map((tab) => {
            const selected = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                id={`${uid}_tab_${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`${uid}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={onTabKeyDown}
                className={`btn-motion flex min-h-[44px] flex-1 items-center justify-center gap-1.5 border-b-2 px-3 text-sm font-medium md:min-h-[32px] ${
                  selected ? 'border-accent text-ink' : 'border-transparent text-ink-2 hover:text-ink'
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <div
        id={`${uid}-panel`}
        role={isOwner ? 'tabpanel' : undefined}
        aria-labelledby={isOwner ? `${uid}_tab_${activeTab}` : undefined}
        className="space-y-4 p-4"
      >
        {activeTab === 'members' ? (
          <>
            {/* Search + Add */}
            {isOwner && (
              <section className="space-y-3">
                <div className="flex items-end gap-2">
                  <ClassroomField
                    id={`${uid}-search`}
                    label="Add people"
                    className="min-w-0 flex-1"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or username (3+ letters)..."
                    autoComplete="off"
                    controlClassName="pl-9"
                    endAdornment={(
                      <span aria-hidden="true" className={ICON_CENTRED}>
                        <Search className="h-4 w-4" strokeWidth={1.5} />
                      </span>
                    )}
                  />
                  <ClassroomField
                    id={`${uid}-add-role`}
                    as="select"
                    label="Role"
                    className="w-32 flex-none"
                    value={selectedPermission}
                    onChange={(e) => setSelectedPermission(e.target.value)}
                  >
                    <option value="view">Viewer</option>
                    <option value="comment">Commenter</option>
                    <option value="edit">Editor</option>
                  </ClassroomField>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <ul aria-label="Matching people" className="max-h-40 overflow-y-auto rounded border border-line bg-surface">
                    {searchResults.map(result => (
                      <li key={result.id}>
                        <button
                          type="button"
                          onClick={() => handleAddMember(result)}
                          className="btn-motion flex min-h-[44px] w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface-hover md:min-h-[32px]"
                        >
                          <span
                            aria-hidden="true"
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium text-white"
                          >
                            {(result.first_name?.[0] || result.username?.[0] || '?').toUpperCase()}
                            {(result.last_name?.[0] || '').toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-ink">
                              {result.first_name && result.last_name
                                ? `${result.first_name} ${result.last_name}`
                                : result.username}
                            </span>
                            <span className="block truncate text-xs text-ink-2">{result.email_hint || result.email}</span>
                          </span>
                          <span className="flex-shrink-0 rounded-sm bg-surface-hover px-1.5 py-0.5 text-xs capitalize text-ink-2">
                            {result.role}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {searchQuery && searchResults.length === 0 && (
                  <p className="py-2 text-center text-xs text-ink-2">No users found</p>
                )}

                {error && <ClassroomAlert>{error}</ClassroomAlert>}
                {success && <ClassroomAlert tone="success">{success}</ClassroomAlert>}
              </section>
            )}

            {/* Members List */}
            <section aria-labelledby={`${uid}-members`} className="space-y-2">
              <h3 id={`${uid}-members`} className="flex items-center gap-1.5 text-sm font-medium text-ink">
                <Users className="h-4 w-4 text-ink-2" strokeWidth={1.5} aria-hidden="true" />
                <span>Members ({members.length})</span>
              </h3>
              <ul className="divide-y divide-line">
                {members.map(member => {
                  const badge = permissionBadge(member.permission);
                  return (
                    <li key={member.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium text-white"
                        >
                          {member.user.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">
                            {member.user.name}
                            {member.user.id === user?.id && <span className="ml-1 text-ink-2">(You)</span>}
                          </p>
                          <p className="truncate text-xs text-ink-2">{member.user.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1">
                        {member.permission === 'owner' ? (
                          <ChalkBadge icon={badge.icon} label={badge.label} />
                        ) : isOwner ? (
                          <>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setShowPermDropdown(showPermDropdown === member.id ? null : member.id)}
                                aria-haspopup="true"
                                aria-expanded={showPermDropdown === member.id}
                                className="btn-motion flex h-11 items-center gap-1 rounded border border-line-strong bg-surface px-2 text-xs font-medium text-ink hover:bg-surface-hover md:h-8"
                              >
                                <span>{badge.label}</span>
                                <ChevronDown className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                              </button>
                              {showPermDropdown === member.id && (
                                <div className="absolute right-0 top-full z-50 mt-1 w-32 rounded-lg border border-line bg-surface py-1 shadow-pop">
                                  {[
                                    { value: 'view', label: 'Viewer' },
                                    { value: 'comment', label: 'Commenter' },
                                    { value: 'edit', label: 'Editor' },
                                  ].map((option) => {
                                    const current = member.permission === option.value;
                                    return (
                                      <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => handleChangePermission(member.id, option.value)}
                                        aria-current={current ? 'true' : undefined}
                                        className={`btn-motion flex min-h-[44px] w-full items-center px-3 text-left text-xs hover:bg-surface-hover md:min-h-[32px] ${
                                          current ? 'font-semibold text-accent' : 'text-ink'
                                        }`}
                                      >
                                        {option.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member.id)}
                              className={`${ICON_BTN} hover:bg-danger-tint hover:text-danger`}
                              title="Remove member"
                              aria-label="Remove member"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                            </button>
                          </>
                        ) : (
                          <ChalkBadge icon={badge.icon} label={badge.label} />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        ) : (
          /* Invite Links Tab */
          <>
            {/* Create New Invite */}
            <section aria-labelledby={`${uid}-create`} className="space-y-3 rounded border border-line bg-surface-hover p-4">
              <h3 id={`${uid}-create`} className="text-sm font-medium text-ink">Create Invite Link</h3>
              <ClassroomField
                id={`${uid}-invite-permission`}
                as="select"
                label="Permission"
                value={invitePermission}
                onChange={(e) => setInvitePermission(e.target.value)}
              >
                <option value="view">View Only</option>
                <option value="comment">Can Comment</option>
                <option value="edit">Can Edit</option>
              </ClassroomField>
              <ClassroomField
                id={`${uid}-invite-expiry`}
                as="select"
                label="Expires in"
                value={inviteExpiry}
                onChange={(e) => setInviteExpiry(e.target.value)}
              >
                <option value="">Never</option>
                <option value="1">1 hour</option>
                <option value="24">24 hours</option>
                <option value="168">7 days</option>
                <option value="720">30 days</option>
              </ClassroomField>
              <ClassroomField
                id={`${uid}-invite-max`}
                as="select"
                label="Max uses"
                value={inviteMaxUses}
                onChange={(e) => setInviteMaxUses(e.target.value)}
              >
                <option value="">Unlimited</option>
                <option value="1">1 use</option>
                <option value="5">5 uses</option>
                <option value="10">10 uses</option>
                <option value="25">25 uses</option>
                <option value="50">50 uses</option>
              </ClassroomField>
              <ClassroomButton
                variant="primary"
                icon={Link2}
                onClick={handleCreateInvite}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Creating...' : 'Generate Link'}
              </ClassroomButton>
            </section>

            {/* Copy feedback: the live region is always mounted so the message is announced. */}
            <p role="status" className="min-h-[20px] text-xs text-success">
              {copiedLink && (
                <span className="inline-flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                  <span>Link copied</span>
                </span>
              )}
            </p>

            {/* Existing Links */}
            {inviteLinks.length > 0 ? (
              <section aria-labelledby={`${uid}-active`} className="space-y-2">
                <h3 id={`${uid}-active`} className="text-sm font-medium text-ink">Active Links ({inviteLinks.length})</h3>
                <ul className="space-y-2">
                  {inviteLinks.map(link => {
                    const limitReached = Boolean(link.max_uses && link.use_count >= link.max_uses);
                    const isExpired = Boolean(link.is_valid === false || (link.expires_at && new Date(link.expires_at) < new Date()) || limitReached);
                    const badge = permissionBadge(link.permission);
                    return (
                      <li key={link.id} className="rounded border border-line bg-surface p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <ChalkBadge icon={badge.icon} label={badge.label} />
                            {isExpired && (
                              <ChalkBadge
                                tone="danger"
                                icon={AlertTriangle}
                                label={limitReached ? 'Limit Reached' : 'Expired'}
                              />
                            )}
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => copyInviteLink(link.token)}
                              className={`${ICON_BTN} hover:bg-accent-tint hover:text-accent`}
                              title="Copy link"
                              aria-label="Copy link"
                            >
                              {copiedLink === link.token
                                ? <Check className="h-4 w-4 text-success" strokeWidth={1.5} aria-hidden="true" />
                                : <Copy className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRevokeInvite(link.id)}
                              className={`${ICON_BTN} hover:bg-danger-tint hover:text-danger`}
                              title="Revoke"
                              aria-label="Revoke"
                            >
                              <X className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-2">
                          {link.expires_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                              <span>Expires {new Date(link.expires_at).toLocaleDateString()}</span>
                            </span>
                          )}
                          <span>{link.use_count}{link.max_uses ? `/${link.max_uses}` : ''} uses</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : (
              <p className="py-4 text-center text-sm text-ink-2">No active invite links</p>
            )}
          </>
        )}
      </div>
    </ClassroomDialog>
  );
}
