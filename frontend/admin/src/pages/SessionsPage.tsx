import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, KeyRound, Search, ShieldAlert } from 'lucide-react'

import { useAuth } from '@shared/auth/AuthProvider'

import { AdminWorkspaceLayout } from '../components/layout/AdminWorkspaceLayout'
import {
  AdminButton,
  AdminPanel,
  DefinitionList,
  EmptyPanel,
  FieldLabel,
  InlineNotice,
  Modal,
  PanelBody,
  PanelHeader,
  StatusBadge,
  Surface,
  TableCell,
  TableHeadRow,
  TableWrap,
  DataTable,
  inputClassName,
  tableActionButtonClassName,
  toolbarInputClassName,
} from '../components/ui/AdminUi'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState'
import {
  formatDateTime,
  formatRelativeTime,
  formatStatusLabel,
} from '../lib/formatting'
import type { AuthAdminSessionItem } from '../types/admin'
import {
  accountLabel,
  accountTone,
  describeTimelineEvent,
  formatReasonList,
  formatSessionCount,
  sessionStatusLabel,
  sessionStatusTone,
  userRoleTone,
} from './sessions/lib/sessionStatus'
import {
  actionConfirmLabel,
  actionHasInlineReason,
  actionSubmittingLabel,
  buildFilterActionState,
  buildInlineReasonActionState,
} from './sessions/lib/revokeActionState'
import { useAuthUsersDirectory } from './sessions/hooks/useAuthUsersDirectory'
import { useFilterSweep } from './sessions/hooks/useFilterSweep'
import { useRevokeAction } from './sessions/hooks/useRevokeAction'
import { useSessionDetail } from './sessions/hooks/useSessionDetail'
import { useSuspiciousQueue } from './sessions/hooks/useSuspiciousQueue'
import { useUserSessionsWorkspace } from './sessions/hooks/useUserSessionsWorkspace'

export function AdminSessionsPage() {
  const auth = useAuth()
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const usersDirectory = useAuthUsersDirectory({
    requestAuth: auth.requestAuth,
  })
  const {
    users,
    filters,
    cursor: usersCursor,
    hasMore: usersHasMore,
    loading: usersLoading,
    loadingMore: usersLoadingMore,
    error: usersError,
    setFilters,
    resetFilters,
    load: loadUsers,
  } = usersDirectory
  const workspace = useUserSessionsWorkspace({
    requestAuth: auth.requestAuth,
    selectedUserId,
  })
  const {
    selectedUser,
    selectedUserLoading,
    selectedUserError,
    visibleSessions,
    sessionsCursor,
    sessionsHasMore,
    sessionsLoading,
    sessionsLoadingMore,
    sessionsError,
    suspiciousActiveCount,
    sessionStatus,
    setSessionStatus,
    sessionSearch,
    setSessionSearch,
    loadSessions: loadUserSessions,
    refresh: refreshSelectedUserWorkspace,
    patchRevokedSessions,
  } = workspace

  const suspiciousQueue = useSuspiciousQueue(auth.requestAuth)

  const sessionDetail = useSessionDetail({
    requestAuth: auth.requestAuth,
    selectedUserId,
  })
  const {
    detail: detailSession,
    loading: detailLoading,
    error: detailError,
    open: detailOpen,
    inspect: inspectSession,
    close: closeSessionDetail,
    patchRevokedSession,
  } = sessionDetail

  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const openUserWorkspace = useCallback(
    (userId: string | null) => {
      setSuccessMessage(null)
      setSessionStatus('active')
      setSessionSearch('')
      setSelectedUserId(userId)
    },
    [setSessionSearch, setSessionStatus]
  )

  useEffect(() => {
    if (usersLoading || usersError) return

    if (users.length === 0) {
      if (selectedUserId !== null) {
        openUserWorkspace(null)
      }
      return
    }

    if (selectedUserId && users.some((user) => user.id === selectedUserId)) {
      return
    }

    openUserWorkspace(users[0].id)
  }, [openUserWorkspace, selectedUserId, users, usersError, usersLoading])

  const revokeActionRef = useRef<
    ReturnType<typeof useRevokeAction> | null
  >(null)
  const filterSweep = useFilterSweep({
    selectedUserId,
    selectedUserEmail: selectedUser?.email ?? null,
    onOpenAction: (request) => {
      setSuccessMessage(null)
      revokeActionRef.current?.setAction(buildFilterActionState(request))
    },
  })
  const {
    open: filterSweepOpen,
    draft: filterSweepDraft,
    preview: filterSweepPreview,
    error: filterSweepError,
    canExecute: canExecuteFilterSweep,
    openSweep: openFilterSweepPanel,
    closeSweep: closeFilterSweepPanel,
    updateDraft: updateFilterSweepDraft,
    setPreview: setFilterSweepPreview,
    setError: setFilterSweepError,
    requestAction: requestFilterSweepAction,
  } = filterSweep

  function applyLocalSessionRevocation(
    sessionIds: readonly string[],
    revokeReason: string
  ) {
    if (sessionIds.length === 0) return
    patchRevokedSessions(sessionIds, revokeReason)
    patchRevokedSession(sessionIds, revokeReason)
    suspiciousQueue.dropSessions(sessionIds)
  }

  async function syncWorkspaceAfterMutation(userId: string) {
    if (selectedUserId !== userId) return
    if (sessionStatus === 'all') {
      await refreshSelectedUserWorkspace()
      return
    }
    setSessionStatus('all')
  }

  const revokeAction = useRevokeAction({
    requestAuth: auth.requestAuth,
    handlers: {
      async onSingleRevoked(response, ctx) {
        setSuccessMessage('Session revoked successfully.')
        applyLocalSessionRevocation([response.session_id], response.revoke_reason)
        await syncWorkspaceAfterMutation(ctx.userId)
      },
      async onAllRevoked(response, ctx) {
        setSuccessMessage(
          `Revoked ${response.revoked_session_count} active session${response.revoked_session_count === 1 ? '' : 's'}.`
        )
        applyLocalSessionRevocation(
          response.revoked_session_ids,
          response.revoke_reason
        )
        await syncWorkspaceAfterMutation(ctx.userId)
      },
      async onSuspiciousRevoked(response, ctx) {
        setSuccessMessage(
          `Revoked ${response.revoked_session_count} suspicious session${response.revoked_session_count === 1 ? '' : 's'}.`
        )
        applyLocalSessionRevocation(
          response.revoked_session_ids,
          response.revoke_reason
        )
        await syncWorkspaceAfterMutation(ctx.userId)
      },
      onFilterPreviewed(response) {
        setFilterSweepPreview(response)
        setFilterSweepError(null)
      },
      async onFilterExecuted(response, ctx) {
        setSuccessMessage(
          `Revoked ${response.revoked_session_count} filtered session${response.revoked_session_count === 1 ? '' : 's'}.`
        )
        applyLocalSessionRevocation(
          response.revoked_session_ids,
          response.revoke_reason
        )
        closeFilterSweep()
        await syncWorkspaceAfterMutation(ctx.userId)
      },
    },
  })
  revokeActionRef.current = revokeAction
  const {
    action: actionState,
    setAction: setActionState,
    updateAction: updateActionState,
    clear: clearAction,
    requestOtp: handleActionOtpRequest,
    confirm: handleConfirmAction,
  } = revokeAction

  useEffect(() => {
    clearAction()
  }, [selectedUserId, clearAction])

  function openFilterSweep() {
    setSuccessMessage(null)
    openFilterSweepPanel()
  }

  function closeFilterSweep() {
    closeFilterSweepPanel()
    if (
      actionState?.kind === 'filterPreview' ||
      actionState?.kind === 'filterExecute'
    ) {
      clearAction()
    }
  }

  async function loadSuspiciousQueue(cursor?: string | null) {
    setSuccessMessage(null)
    await suspiciousQueue.load(cursor)
  }

  function openSingleRevoke(
    session: AuthAdminSessionItem,
    options?: { userEmail?: string }
  ) {
    setActionState(
      buildInlineReasonActionState({
        kind: 'single',
        userId: session.user_id,
        sessionId: session.session_id,
        title: 'Verify revoke action',
        description: `Revoke ${session.device_label} for ${options?.userEmail ?? selectedUser?.email ?? 'the selected user'}.`,
      })
    )
  }

  function openBulkRevoke(kind: 'all' | 'suspicious') {
    if (!selectedUserId || !selectedUser) return
    const description =
      kind === 'all'
        ? `Revoke every active authSDK session for ${selectedUser.email}.`
        : `Revoke suspicious active sessions for ${selectedUser.email}.`

    setActionState(
      buildInlineReasonActionState({
        kind,
        userId: selectedUserId,
        title: 'Verify revoke action',
        description,
      })
    )
  }

  function openFilterSweepAction(kind: 'preview' | 'execute') {
    requestFilterSweepAction(kind)
  }

  return (
    <AdminWorkspaceLayout title="Sessions">
      <div className="space-y-6">
        <InlineNotice>
          Review authSDK sessions for any TWA user, inspect suspicious logins,
          and revoke access with step-up verification.
        </InlineNotice>

        {successMessage ? (
          <InlineNotice tone="success">{successMessage}</InlineNotice>
        ) : null}

        <AdminPanel>
          <PanelHeader
            title="User Directory"
            subtitle="Search auth users first, then drill into one user's session inventory."
            action={
              <form
                className="grid gap-3 xl:grid-cols-[220px_160px_160px_auto_auto]"
                onSubmit={(event) => {
                  event.preventDefault()
                  setSuccessMessage(null)
                  void loadUsers()
                }}
              >
                <div>
                  <FieldLabel>Email filter</FieldLabel>
                  <input
                    aria-label="Filter by email"
                    className={toolbarInputClassName}
                    placeholder="user@example.com"
                    value={filters.email}
                    onChange={(event) =>
                      setFilters({ ...filters, email: event.target.value })
                    }
                  />
                </div>
                <div>
                  <FieldLabel>Auth role</FieldLabel>
                  <select
                    aria-label="Filter by auth role"
                    className={toolbarInputClassName}
                    value={filters.role}
                    onChange={(event) =>
                      setFilters({ ...filters, role: event.target.value })
                    }
                  >
                    <option value="">All roles</option>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>Lock status</FieldLabel>
                  <select
                    aria-label="Filter by lock status"
                    className={toolbarInputClassName}
                    value={filters.locked}
                    onChange={(event) =>
                      setFilters({ ...filters, locked: event.target.value })
                    }
                  >
                    <option value="all">All users</option>
                    <option value="locked">Locked only</option>
                    <option value="unlocked">Unlocked only</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <AdminButton icon={Search} type="submit">
                    Search
                  </AdminButton>
                </div>
                <div className="flex items-end">
                  <AdminButton
                    variant="secondary"
                    onClick={() => {
                      resetFilters()
                      setSuccessMessage(null)
                    }}
                  >
                    Reset
                  </AdminButton>
                </div>
              </form>
            }
          />
          <PanelBody className="p-0">
            {usersLoading ? (
              <LoadingState title="Loading auth users..." />
            ) : usersError ? (
              <div className="px-6 py-6">
                <ErrorState title="User lookup unavailable" message={usersError} />
              </div>
            ) : users.length === 0 ? (
              <div className="px-6 py-6">
                <EmptyState
                  title="No auth users found"
                  message="Adjust the current filters or broaden the email search."
                />
              </div>
            ) : (
              <>
                <TableWrap>
                  <DataTable>
                    <thead>
                      <TableHeadRow>
                        <TableCell header>Email</TableCell>
                        <TableCell header>Auth Role</TableCell>
                        <TableCell header>Account</TableCell>
                        <TableCell header>Created</TableCell>
                        <TableCell header className="text-right">
                          Actions
                        </TableCell>
                      </TableHeadRow>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr
                          key={user.id}
                          className={
                            selectedUserId === user.id ? 'bg-[#fffaf0]' : ''
                          }
                        >
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-semibold text-slate-900">
                                {user.email}
                              </p>
                              <p className="text-xs text-slate-500">
                                {user.id}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge tone={userRoleTone(user.role)}>
                              {formatStatusLabel(user.role)}
                            </StatusBadge>
                          </TableCell>
                          <TableCell>
                            <StatusBadge tone={accountTone(user)}>
                              {accountLabel(user)}
                            </StatusBadge>
                          </TableCell>
                          <TableCell>{formatDateTime(user.created_at)}</TableCell>
                          <TableCell className="text-right">
                              <AdminButton
                                className={tableActionButtonClassName}
                                variant={
                                  selectedUserId === user.id ? 'primary' : 'secondary'
                                }
                                onClick={() => openUserWorkspace(user.id)}
                              >
                                Manage sessions
                              </AdminButton>
                          </TableCell>
                        </tr>
                      ))}
                    </tbody>
                  </DataTable>
                </TableWrap>

                {usersHasMore ? (
                  <div className="px-6 py-5">
                    <AdminButton
                      disabled={!usersCursor || usersLoadingMore}
                      variant="secondary"
                      onClick={() => void loadUsers(usersCursor)}
                    >
                      {usersLoadingMore ? 'Loading more...' : 'Load more users'}
                    </AdminButton>
                  </div>
                ) : null}
              </>
            )}
          </PanelBody>
        </AdminPanel>

        <AdminPanel>
          <PanelHeader
            title="Suspicious session queue"
            subtitle="Review active suspicious sessions across all auth users."
            action={
              <div className="grid gap-3 lg:grid-cols-[280px_auto]">
                <input
                  aria-label="Filter suspicious queue"
                  className={toolbarInputClassName}
                  disabled={!suspiciousQueue.loaded || suspiciousQueue.loading}
                  placeholder="Filter email, device, IP, reason..."
                  value={suspiciousQueue.search}
                  onChange={(event) =>
                    suspiciousQueue.setSearch(event.target.value)
                  }
                />
                <AdminButton
                  disabled={suspiciousQueue.loading}
                  icon={ShieldAlert}
                  variant="secondary"
                  onClick={() => void loadSuspiciousQueue()}
                >
                  {suspiciousQueue.loading
                    ? 'Loading suspicious queue...'
                    : suspiciousQueue.loaded
                      ? 'Refresh suspicious queue'
                      : 'Load suspicious queue'}
                </AdminButton>
              </div>
            }
          />
          <PanelBody className="space-y-4">
            <InlineNotice>
              This queue is backed by authSDK and returns active suspicious
              sessions globally, ordered by newest activity first.
            </InlineNotice>

            {suspiciousQueue.loading && suspiciousQueue.loaded ? (
              <InlineNotice>Refreshing suspicious queue...</InlineNotice>
            ) : null}

            {suspiciousQueue.hasMore ? (
              <InlineNotice>
                More suspicious sessions are available. Load more to continue
                triage.
              </InlineNotice>
            ) : null}

            {suspiciousQueue.error && suspiciousQueue.loaded ? (
              <InlineNotice tone="danger">{suspiciousQueue.error}</InlineNotice>
            ) : null}

            {suspiciousQueue.loading && !suspiciousQueue.loaded ? (
              <LoadingState title="Loading suspicious sessions..." />
            ) : suspiciousQueue.error && !suspiciousQueue.loaded ? (
              <ErrorState
                title="Suspicious queue unavailable"
                message={suspiciousQueue.error}
              />
            ) : !suspiciousQueue.loaded ? (
              <EmptyState
                title="Load the suspicious queue"
                message="Fetch the global suspicious queue to start security triage."
              />
            ) : suspiciousQueue.items.length === 0 ? (
              <EmptyState
                title="No suspicious active sessions found"
                message="authSDK did not return any active suspicious sessions for the current queue page."
              />
            ) : (
              <>
                <Surface className="space-y-2">
                  <p className="text-sm font-semibold text-slate-950">
                    {suspiciousQueue.items.length} suspicious session
                    {suspiciousQueue.items.length === 1 ? '' : 's'} across{' '}
                    {suspiciousQueue.uniqueUserCount} user
                    {suspiciousQueue.uniqueUserCount === 1 ? '' : 's'}.
                  </p>
                  <p className="text-sm text-slate-500">
                    Loaded {formatSessionCount(suspiciousQueue.items.length)}
                    {suspiciousQueue.hasMore
                      ? ' so far from the queue.'
                      : ' from the queue.'}
                  </p>
                </Surface>

                {suspiciousQueue.visibleItems.length === 0 ? (
                  <EmptyState
                    title="No suspicious sessions match the current queue filter"
                    message="Clear or broaden the queue filter to see the loaded suspicious sessions again."
                  />
                ) : (
                  <>
                    <TableWrap>
                      <DataTable>
                        <thead>
                          <TableHeadRow>
                            <TableCell header>User</TableCell>
                            <TableCell header>Device</TableCell>
                            <TableCell header>Risk</TableCell>
                            <TableCell header>Last Seen</TableCell>
                            <TableCell header className="text-right">
                              Actions
                            </TableCell>
                          </TableHeadRow>
                        </thead>
                        <tbody>
                          {suspiciousQueue.visibleItems.map((session) => (
                            <tr key={`queue-${session.user_id}-${session.session_id}`}>
                              <TableCell>
                                <div className="space-y-1">
                                  <p className="font-semibold text-slate-900">
                                    {session.user_email}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {formatStatusLabel(session.user_role)}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <p className="font-semibold text-slate-900">
                                    {session.device_label}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {session.ip_address ?? 'Unknown IP'}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <p className="max-w-[240px] text-sm text-slate-700">
                                  {formatReasonList(session.suspicious_reasons)}
                                </p>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <p>{formatRelativeTime(session.last_seen_at)}</p>
                                  <p className="text-xs text-slate-500">
                                    {formatDateTime(session.last_seen_at)}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <AdminButton
                                    aria-label={`Open workspace ${session.user_email}`}
                                    className={tableActionButtonClassName}
                                    variant="secondary"
                                    onClick={() => openUserWorkspace(session.user_id)}
                                  >
                                    Open workspace
                                  </AdminButton>
                                  <AdminButton
                                    aria-label={`Inspect queued session ${session.device_label}`}
                                    className={tableActionButtonClassName}
                                    variant="secondary"
                                    onClick={() =>
                                      void inspectSession(
                                        session.user_id,
                                        session.session_id
                                      )
                                    }
                                  >
                                    Inspect
                                  </AdminButton>
                                  <AdminButton
                                    aria-label={`Revoke queued session ${session.device_label}`}
                                    className={tableActionButtonClassName}
                                    variant="danger"
                                    onClick={() =>
                                      openSingleRevoke(session, {
                                        userEmail: session.user_email,
                                      })
                                    }
                                  >
                                    Revoke
                                  </AdminButton>
                                </div>
                              </TableCell>
                            </tr>
                          ))}
                        </tbody>
                      </DataTable>
                    </TableWrap>

                    {suspiciousQueue.hasMore ? (
                      <div className="px-6 py-5">
                        <AdminButton
                          disabled={
                            !suspiciousQueue.cursor ||
                            suspiciousQueue.loadingMore
                          }
                          variant="secondary"
                          onClick={() =>
                            void loadSuspiciousQueue(suspiciousQueue.cursor)
                          }
                        >
                          {suspiciousQueue.loadingMore
                            ? 'Loading more suspicious sessions...'
                            : 'Load more suspicious sessions'}
                        </AdminButton>
                      </div>
                    ) : null}
                  </>
                )}
              </>
            )}
          </PanelBody>
        </AdminPanel>

        {!selectedUserId ? (
          <EmptyPanel
            title="Select a user to inspect sessions"
            message="Choose one auth user from the directory above to review devices, risk flags, and revoke options."
          />
        ) : selectedUserLoading && !selectedUser ? (
          <LoadingState title="Loading selected user..." />
        ) : selectedUserError ? (
          <ErrorState title="Selected user unavailable" message={selectedUserError} />
        ) : selectedUser ? (
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Surface className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8da2c5]">
                    Security summary
                  </p>
                  <h2 className="admin-display mt-2 text-[1.7rem] font-semibold text-slate-950">
                    {selectedUser.email}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Review active access, suspicious logins, and step-up protected
                    revoke actions for this auth identity.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge tone={userRoleTone(selectedUser.role)}>
                    {formatStatusLabel(selectedUser.role)}
                  </StatusBadge>
                  <StatusBadge tone={accountTone(selectedUser)}>
                    {accountLabel(selectedUser)}
                  </StatusBadge>
                </div>
              </div>

              <DefinitionList
                items={[
                  {
                    label: 'Active Sessions',
                    value: selectedUser.active_session_count,
                  },
                  {
                    label: 'Email Verified',
                    value: selectedUser.email_verified ? 'Verified' : 'Unverified',
                  },
                  {
                    label: 'Email OTP',
                    value: selectedUser.email_otp_enabled ? 'Enabled' : 'Disabled',
                  },
                  {
                    label: 'Locked',
                    value: selectedUser.locked
                      ? selectedUser.lock_retry_after
                        ? `Yes - retry after ${selectedUser.lock_retry_after}s`
                        : 'Yes'
                      : 'No',
                  },
                  {
                    label: 'Created',
                    value: formatDateTime(selectedUser.created_at),
                  },
                  {
                    label: 'Updated',
                    value: formatDateTime(selectedUser.updated_at),
                  },
                ]}
              />

              <div className="grid gap-3 lg:grid-cols-3">
                <AdminButton
                  disabled={suspiciousActiveCount === 0}
                  icon={ShieldAlert}
                  variant="warning"
                  onClick={() => openBulkRevoke('suspicious')}
                >
                  Revoke suspicious sessions
                </AdminButton>
                <AdminButton
                  icon={AlertTriangle}
                  variant="danger"
                  onClick={() => openBulkRevoke('all')}
                >
                  Revoke all active sessions
                </AdminButton>
                <AdminButton
                  icon={Search}
                  variant="secondary"
                  onClick={openFilterSweep}
                >
                  Open filter sweep
                </AdminButton>
              </div>

              <InlineNotice tone="info">
                Sensitive revoke actions always require an extra one-time code
                from authSDK before the mutation is sent.
              </InlineNotice>
            </Surface>

            <AdminPanel>
              <PanelHeader
                title="Session Inventory"
                subtitle="Risk flags and device details come directly from authSDK."
                action={
                  <div className="grid gap-3 lg:grid-cols-[180px_260px]">
                    <select
                      aria-label="Session status filter"
                      className={toolbarInputClassName}
                      value={sessionStatus}
                      onChange={(event) =>
                        setSessionStatus(
                          event.target.value as 'active' | 'revoked' | 'all'
                        )
                      }
                    >
                      <option value="active">Active sessions</option>
                      <option value="revoked">Revoked sessions</option>
                      <option value="all">All sessions</option>
                    </select>
                    <input
                      aria-label="Search sessions"
                      className={toolbarInputClassName}
                      placeholder="Search device, IP, reason..."
                      value={sessionSearch}
                      onChange={(event) => setSessionSearch(event.target.value)}
                    />
                  </div>
                }
              />
              <PanelBody className="p-0">
                {sessionsLoading ? (
                  <LoadingState title="Loading sessions..." />
                ) : sessionsError ? (
                  <div className="px-6 py-6">
                    <ErrorState
                      title="Session inventory unavailable"
                      message={sessionsError}
                    />
                  </div>
                ) : visibleSessions.length === 0 ? (
                  <div className="px-6 py-6">
                    <EmptyState
                      title="No sessions match the current view"
                      message="Change the status filter or broaden the search query."
                    />
                  </div>
                ) : (
                  <>
                    <TableWrap>
                      <DataTable>
                        <thead>
                          <TableHeadRow>
                            <TableCell header>Device</TableCell>
                            <TableCell header>Risk</TableCell>
                            <TableCell header>IP</TableCell>
                            <TableCell header>Last Seen</TableCell>
                            <TableCell header>Status</TableCell>
                            <TableCell header className="text-right">
                              Actions
                            </TableCell>
                          </TableHeadRow>
                        </thead>
                        <tbody>
                          {visibleSessions.map((session) => (
                            <tr key={session.session_id}>
                              <TableCell>
                                <div className="space-y-1">
                                  <p className="font-semibold text-slate-900">
                                    {session.device_label}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Created {formatDateTime(session.created_at)}
                                  </p>
                                  {session.revoke_reason ? (
                                    <p className="text-xs text-slate-500">
                                      {session.revoke_reason}
                                    </p>
                                  ) : null}
                                </div>
                              </TableCell>
                              <TableCell>
                                {session.is_suspicious ? (
                                  <div className="space-y-2">
                                    <StatusBadge tone="warning">
                                      Suspicious
                                    </StatusBadge>
                                    <p className="max-w-[220px] text-xs text-slate-500">
                                      {formatReasonList(session.suspicious_reasons)}
                                    </p>
                                  </div>
                                ) : (
                                  <StatusBadge tone="success">Normal</StatusBadge>
                                )}
                              </TableCell>
                              <TableCell>{session.ip_address ?? 'Unknown'}</TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <p>{formatRelativeTime(session.last_seen_at)}</p>
                                  <p className="text-xs text-slate-500">
                                    {formatDateTime(session.last_seen_at)}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <StatusBadge tone={sessionStatusTone(session)}>
                                  {sessionStatusLabel(session)}
                                </StatusBadge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <AdminButton
                                    aria-label={`Inspect session ${session.device_label}`}
                                    className={tableActionButtonClassName}
                                    variant="secondary"
                                    onClick={() =>
                                      void inspectSession(
                                        session.user_id,
                                        session.session_id
                                      )
                                    }
                                  >
                                    Inspect
                                  </AdminButton>
                                  <AdminButton
                                    aria-label={`Revoke session ${session.device_label}`}
                                    className={tableActionButtonClassName}
                                    disabled={Boolean(session.revoked_at)}
                                    variant="danger"
                                    onClick={() => openSingleRevoke(session)}
                                  >
                                    Revoke
                                  </AdminButton>
                                </div>
                              </TableCell>
                            </tr>
                          ))}
                        </tbody>
                      </DataTable>
                    </TableWrap>

                    {sessionsHasMore ? (
                      <div className="px-6 py-5">
                        <AdminButton
                          disabled={!sessionsCursor || sessionsLoadingMore}
                          variant="secondary"
                          onClick={() => void loadUserSessions(sessionsCursor)}
                        >
                          {sessionsLoadingMore
                            ? 'Loading more...'
                            : 'Load more sessions'}
                        </AdminButton>
                      </div>
                    ) : null}
                  </>
                )}
              </PanelBody>
            </AdminPanel>
          </div>
        ) : null}

        <Modal
          open={detailOpen}
          title="Session detail"
          onClose={closeSessionDetail}
        >
          {detailLoading ? (
            <LoadingState title="Loading session detail..." />
          ) : detailError ? (
            <ErrorState title="Session detail unavailable" message={detailError} />
          ) : detailSession ? (
            <div className="space-y-6">
              <DefinitionList
                items={[
                  { label: 'Device', value: detailSession.device_label },
                  {
                    label: 'IP address',
                    value: detailSession.ip_address ?? 'Unknown',
                  },
                  {
                    label: 'User agent',
                    value: detailSession.user_agent ?? 'Unknown',
                  },
                  {
                    label: 'Created',
                    value: formatDateTime(detailSession.created_at),
                  },
                  {
                    label: 'Last seen',
                    value: formatDateTime(detailSession.last_seen_at),
                  },
                  {
                    label: 'Expires',
                    value: formatDateTime(detailSession.expires_at),
                  },
                  {
                    label: 'Revoked',
                    value: detailSession.revoked_at
                      ? formatDateTime(detailSession.revoked_at)
                      : 'Not revoked',
                  },
                  {
                    label: 'Risk reasons',
                    value: formatReasonList(detailSession.suspicious_reasons),
                  },
                ]}
              />

              <Surface className="space-y-4">
                <div className="flex items-center gap-3">
                  <KeyRound className="h-5 w-5 text-[#b77712]" />
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      Attributable timeline
                    </p>
                    <p className="text-sm text-slate-500">
                      Only events directly attributable to this auth session are
                      shown.
                    </p>
                  </div>
                </div>

                {detailSession.timeline.length === 0 ? (
                  <EmptyState
                    title="No attributable events"
                    message="This session does not have any stitched timeline events yet."
                  />
                ) : (
                  <ul className="space-y-3">
                    {detailSession.timeline.map((event, index) => (
                      <li
                        key={`${event.event_type}-${event.created_at}-${index}`}
                        className="rounded-2xl border border-[#eadfce] bg-[#fcfaf6] px-4 py-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-950">
                              {describeTimelineEvent(event.event_type)}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {formatDateTime(event.created_at)}
                            </p>
                          </div>
                          <StatusBadge tone={event.success ? 'success' : 'danger'}>
                            {event.success ? 'Success' : 'Failed'}
                          </StatusBadge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Surface>
            </div>
          ) : (
            <EmptyState
              title="No session selected"
              message="Choose one session from the inventory to inspect its detail."
            />
          )}
        </Modal>

        <Modal
          open={filterSweepOpen}
          title="Filter sweep builder"
          onClose={closeFilterSweep}
          className="max-w-4xl"
        >
          <div className="space-y-6">
            <InlineNotice>
              Build a targeted revoke sweep, preview the matching sessions, then
              execute the revoke through a second verified action.
            </InlineNotice>

            {filterSweepError ? (
              <InlineNotice tone="danger">{filterSweepError}</InlineNotice>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-[#e0d3c0] bg-[#fcfaf6] px-4 py-4 text-sm text-slate-700">
                <input
                  aria-label="Suspicious sessions only"
                  checked={filterSweepDraft.isSuspiciousOnly}
                  type="checkbox"
                  onChange={(event) =>
                    updateFilterSweepDraft({
                      isSuspiciousOnly: event.target.checked,
                    })
                  }
                />
                <span>Suspicious sessions only</span>
              </label>

              <div>
                <FieldLabel>Revoke reason for sweep</FieldLabel>
                <input
                  aria-label="Revoke reason for sweep"
                  className={inputClassName}
                  placeholder="risk_sweep"
                  value={filterSweepDraft.reason}
                  onChange={(event) =>
                    updateFilterSweepDraft({
                      reason: event.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <FieldLabel>Created after</FieldLabel>
                <input
                  aria-label="Created after"
                  className={inputClassName}
                  type="datetime-local"
                  value={filterSweepDraft.createdAfter}
                  onChange={(event) =>
                    updateFilterSweepDraft({
                      createdAfter: event.target.value,
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel>Created before</FieldLabel>
                <input
                  aria-label="Created before"
                  className={inputClassName}
                  type="datetime-local"
                  value={filterSweepDraft.createdBefore}
                  onChange={(event) =>
                    updateFilterSweepDraft({
                      createdBefore: event.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <FieldLabel>Last seen after</FieldLabel>
                <input
                  aria-label="Last seen after"
                  className={inputClassName}
                  type="datetime-local"
                  value={filterSweepDraft.lastSeenAfter}
                  onChange={(event) =>
                    updateFilterSweepDraft({
                      lastSeenAfter: event.target.value,
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel>Last seen before</FieldLabel>
                <input
                  aria-label="Last seen before"
                  className={inputClassName}
                  type="datetime-local"
                  value={filterSweepDraft.lastSeenBefore}
                  onChange={(event) =>
                    updateFilterSweepDraft({
                      lastSeenBefore: event.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <FieldLabel>IP address</FieldLabel>
                <input
                  aria-label="IP address"
                  className={inputClassName}
                  placeholder="203.0.113.10"
                  value={filterSweepDraft.ipAddress}
                  onChange={(event) =>
                    updateFilterSweepDraft({
                      ipAddress: event.target.value,
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel>User agent contains</FieldLabel>
                <input
                  aria-label="User agent contains"
                  className={inputClassName}
                  placeholder="Chrome"
                  value={filterSweepDraft.userAgentContains}
                  onChange={(event) =>
                    updateFilterSweepDraft({
                      userAgentContains: event.target.value,
                    })
                  }
                />
              </div>
            </div>

            {filterSweepPreview ? (
              <Surface className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      Preview matched{' '}
                      {formatSessionCount(filterSweepPreview.matched_session_count)}.
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Re-run the preview after changing any filter before
                      executing the sweep.
                    </p>
                  </div>
                  <StatusBadge tone="warning">Preview only</StatusBadge>
                </div>

                {filterSweepPreview.matched_session_ids.length > 0 ? (
                  <ul className="grid gap-3 md:grid-cols-2">
                    {filterSweepPreview.matched_session_ids.map((sessionId) => (
                      <li
                        key={sessionId}
                        className="rounded-2xl border border-[#eadfce] bg-[#fcfaf6] px-4 py-3 font-mono text-sm text-slate-700"
                      >
                        {sessionId}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    title="No matching sessions"
                    message="Adjust the current selectors and run another preview."
                  />
                )}
              </Surface>
            ) : (
              <InlineNotice>
                Preview the current selectors to see exactly which session IDs
                would be revoked before executing the sweep.
              </InlineNotice>
            )}

            <div className="flex flex-wrap justify-end gap-3">
              <AdminButton
                variant="secondary"
                onClick={() => openFilterSweepAction('preview')}
              >
                Preview matches
              </AdminButton>
              <AdminButton
                disabled={!canExecuteFilterSweep}
                variant="danger"
                onClick={() => openFilterSweepAction('execute')}
              >
                Execute revoke sweep
              </AdminButton>
            </div>
          </div>
        </Modal>

        <Modal
          open={Boolean(actionState)}
          title={actionState?.title ?? 'Verify revoke action'}
          onClose={() => setActionState(null)}
          className="max-w-2xl"
        >
          {actionState ? (
            <div className="space-y-5">
              <InlineNotice
                tone={actionState.kind === 'filterPreview' ? 'info' : 'danger'}
              >
                {actionState.description}
              </InlineNotice>

              {actionState.error ? (
                <InlineNotice tone="danger">{actionState.error}</InlineNotice>
              ) : null}
              {actionState.info ? (
                <InlineNotice>{actionState.info}</InlineNotice>
              ) : null}

              {actionHasInlineReason(actionState) ? (
                <div>
                  <FieldLabel>Revoke reason</FieldLabel>
                  <input
                    aria-label="Revoke reason"
                    className={inputClassName}
                    placeholder="compromised_device"
                    value={actionState.reason}
                    onChange={(event) =>
                      updateActionState({ reason: event.target.value })
                    }
                  />
                </div>
              ) : actionState.payload.reason ? (
                <InlineNotice>
                  Revoke reason: <span className="font-semibold">{actionState.payload.reason}</span>
                </InlineNotice>
              ) : null}

              {actionState.otpRequested ? (
                <div>
                  <FieldLabel>One-time code</FieldLabel>
                  <input
                    aria-label="One-time code"
                    className={inputClassName}
                    inputMode="numeric"
                    placeholder="123456"
                    value={actionState.code}
                    onChange={(event) =>
                      updateActionState({ code: event.target.value })
                    }
                  />
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-3">
                {!actionState.otpRequested ? (
                  <AdminButton
                    disabled={actionState.submitting}
                    icon={KeyRound}
                    onClick={() => void handleActionOtpRequest()}
                  >
                    {actionState.submitting
                      ? 'Sending code...'
                      : 'Send verification code'}
                  </AdminButton>
                ) : (
                  <AdminButton
                    disabled={actionState.submitting}
                    icon={ShieldAlert}
                    variant={
                      actionState.kind === 'filterPreview' ? 'primary' : 'danger'
                    }
                    onClick={() => void handleConfirmAction()}
                  >
                    {actionState.submitting
                      ? actionSubmittingLabel(actionState)
                      : actionConfirmLabel(actionState)}
                  </AdminButton>
                )}
              </div>
            </div>
          ) : null}
        </Modal>
      </div>
    </AdminWorkspaceLayout>
  )
}
