import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Users, Trash2, ChevronDown, Link2, Copy, Check, Clock, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usersApi, sharesApi, boardsApi } from '../../services/api';

export default function ShareModal({ isOpen, onClose, boardId, boardName }) {
  const { user } = useAuth();
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
  const searchRef = useRef(null);
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
          email: targetUser.email,
        },
        permission: selectedPermission,
      };
      setMembers(prev => [...prev, newMember]);
      setSearchQuery('');
      setSearchResults([]);
      const displayName = targetUser.first_name ? `${targetUser.first_name} ${targetUser.last_name}` : targetUser.username;
      const permLabel = { edit: 'Editor', comment: 'Commenter', view: 'Viewer' }[selectedPermission] || 'Viewer';
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

  if (!isOpen) return null;

  const isOwner = members.find(m => m.permission === 'owner')?.user.id === user?.id;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-backdropFade" onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} role="dialog" aria-modal="true" aria-label="Share board">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col animate-scaleIn" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold text-gray-900">Share Board</h3>
            <p className="text-xs text-gray-500 mt-0.5">{boardName}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        {isOwner && (
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('members')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium ${activeTab === 'members' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Users className="w-4 h-4 inline mr-1" />
              Members
            </button>
            <button
              onClick={() => setActiveTab('invite')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium ${activeTab === 'invite' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Link2 className="w-4 h-4 inline mr-1" />
              Invite Links
            </button>
          </div>
        )}

        {activeTab === 'members' ? (
          <>
            {/* Search + Add */}
            {isOwner && (
              <div className="p-4 border-b">
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      ref={searchRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name or email..."
                      className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <select
                    value={selectedPermission}
                    onChange={(e) => setSelectedPermission(e.target.value)}
                    className="px-2 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="view">Viewer</option>
                    <option value="comment">Commenter</option>
                    <option value="edit">Editor</option>
                  </select>
                </div>

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="mt-2 border rounded-lg bg-white shadow-sm max-h-40 overflow-y-auto">
                    {searchResults.map(result => (
                      <button
                        key={result.id}
                        onClick={() => handleAddMember(result)}
                        className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-indigo-50 text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs flex-shrink-0">
                          {(result.first_name?.[0] || result.username?.[0] || '?').toUpperCase()}
                          {(result.last_name?.[0] || '').toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {result.first_name && result.last_name
                              ? `${result.first_name} ${result.last_name}`
                              : result.username}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{result.email}</p>
                        </div>
                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded capitalize flex-shrink-0">{result.role}</span>
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery && searchResults.length === 0 && (
                  <p className="mt-2 text-xs text-gray-500 text-center py-2">No users found</p>
                )}

                {error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                    {success}
                  </div>
                )}
              </div>
            )}

            {/* Members List */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center space-x-1 mb-3">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Members ({members.length})</span>
              </div>
              <div className="space-y-2">
                {members.map(member => (
                  <div key={member.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs flex-shrink-0">
                        {member.user.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {member.user.name}
                          {member.user.id === user?.id && <span className="text-gray-400 ml-1">(You)</span>}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{member.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      {member.permission === 'owner' ? (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-medium">Owner</span>
                      ) : isOwner ? (
                        <>
                          <div className="relative">
                            <button
                              onClick={() => setShowPermDropdown(showPermDropdown === member.id ? null : member.id)}
                              className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 flex items-center space-x-1"
                            >
                              <span className="capitalize">{{ edit: 'Editor', comment: 'Commenter', view: 'Viewer' }[member.permission] || 'Viewer'}</span>
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            {showPermDropdown === member.id && (
                              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border py-1 z-50 w-28 animate-slideDown">
                                <button
                                  onClick={() => handleChangePermission(member.id, 'view')}
                                  className={`w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 ${member.permission === 'view' ? 'font-semibold text-indigo-600' : ''}`}
                                >
                                  Viewer
                                </button>
                                <button
                                  onClick={() => handleChangePermission(member.id, 'comment')}
                                  className={`w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 ${member.permission === 'comment' ? 'font-semibold text-indigo-600' : ''}`}
                                >
                                  Commenter
                                </button>
                                <button
                                  onClick={() => handleChangePermission(member.id, 'edit')}
                                  className={`w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 ${member.permission === 'edit' ? 'font-semibold text-indigo-600' : ''}`}
                                >
                                  Editor
                                </button>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                            title="Remove member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded capitalize">
                          {{ edit: 'Editor', comment: 'Commenter', view: 'Viewer' }[member.permission] || 'Viewer'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Invite Links Tab */
          <div className="flex-1 overflow-y-auto p-4">
            {/* Create New Invite */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Create Invite Link</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <label className="text-xs text-gray-600 w-20">Permission</label>
                  <select
                    value={invitePermission}
                    onChange={(e) => setInvitePermission(e.target.value)}
                    className="flex-1 px-2 py-1.5 border rounded text-sm bg-white"
                  >
                    <option value="view">View Only</option>
                    <option value="comment">Can Comment</option>
                    <option value="edit">Can Edit</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-xs text-gray-600 w-20">Expires in</label>
                  <select
                    value={inviteExpiry}
                    onChange={(e) => setInviteExpiry(e.target.value)}
                    className="flex-1 px-2 py-1.5 border rounded text-sm bg-white"
                  >
                    <option value="">Never</option>
                    <option value="1">1 hour</option>
                    <option value="24">24 hours</option>
                    <option value="168">7 days</option>
                    <option value="720">30 days</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-xs text-gray-600 w-20">Max uses</label>
                  <select
                    value={inviteMaxUses}
                    onChange={(e) => setInviteMaxUses(e.target.value)}
                    className="flex-1 px-2 py-1.5 border rounded text-sm bg-white"
                  >
                    <option value="">Unlimited</option>
                    <option value="1">1 use</option>
                    <option value="5">5 uses</option>
                    <option value="10">10 uses</option>
                    <option value="25">25 uses</option>
                    <option value="50">50 uses</option>
                  </select>
                </div>
                <button
                  onClick={handleCreateInvite}
                  disabled={loading}
                  className="w-full px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center space-x-1"
                >
                  <Link2 className="w-4 h-4" />
                  <span>{loading ? 'Creating...' : 'Generate Link'}</span>
                </button>
              </div>
            </div>

            {/* Existing Links */}
            {inviteLinks.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Active Links ({inviteLinks.length})</h4>
                {inviteLinks.map(link => {
                  const isExpired = link.is_valid === false || (link.expires_at && new Date(link.expires_at) < new Date()) || (link.max_uses && link.use_count >= link.max_uses);
                  return (
                  <div key={link.id} className={`bg-white border rounded-lg p-3 ${isExpired ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-medium capitalize bg-gray-100 px-2 py-0.5 rounded">
                          {{ edit: 'Editor', comment: 'Commenter', view: 'Viewer' }[link.permission] || 'Viewer'}
                        </span>
                        {isExpired && (
                          <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded">
                            {link.max_uses && link.use_count >= link.max_uses ? 'Limit Reached' : 'Expired'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => copyInviteLink(link.token)}
                          className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                          title="Copy link"
                        >
                          {copiedLink === link.token ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleRevokeInvite(link.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                          title="Revoke"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                      {link.expires_at && (
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>Expires {new Date(link.expires_at).toLocaleDateString()}</span>
                        </span>
                      )}
                      <span>{link.use_count}{link.max_uses ? `/${link.max_uses}` : ''} uses</span>
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-sm text-gray-500 py-4">No active invite links</p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
