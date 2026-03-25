import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { teamService } from '@/services/team.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Building2, CheckCircle, AlertTriangle } from 'lucide-react';

export default function JoinOrganization() {
  const [searchParams] = useSearchParams();
  const inviteParam = searchParams.get('invite');
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  const [invitation, setInvitation] = useState<any>(null);
  const [resolvedInvite, setResolvedInvite] = useState<{ inviteId?: string; token?: string } | null>(null);
  const [orgName, setOrgName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!inviteParam) {
      setError('No invitation identifier provided.');
      setLoading(false);
      return;
    }

    const fetchInvitation = async () => {
      const byId = await supabase
        .from('team_invitations')
        .select('*, organizations(name)')
        .eq('id', inviteParam)
        .eq('status', 'pending')
        .maybeSingle();

      let data = byId.data;
      let fetchErr = byId.error;

      if (!data) {
        const byToken = await supabase
          .from('team_invitations')
          .select('*, organizations(name)')
          .eq('token', inviteParam)
          .eq('status', 'pending')
          .maybeSingle();
        data = byToken.data;
        fetchErr = byToken.error;
        if (data) {
          setResolvedInvite({ token: inviteParam });
        }
      } else {
        setResolvedInvite({ inviteId: inviteParam });
      }

      if (fetchErr || !data) {
        setError('This invitation is invalid or has already been used.');
        setLoading(false);
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired.');
        setLoading(false);
        return;
      }

      setInvitation(data);
      setOrgName((data as any).organizations?.name || 'the organization');
      setLoading(false);
    };

    fetchInvitation();
  }, [inviteParam]);

  const handleAccept = async () => {
    if (!resolvedInvite) return;
    setAccepting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You need to be logged in.');
        return;
      }

      await teamService.acceptInvitation(resolvedInvite.inviteId || resolvedInvite.token || '');
      setSuccess(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to accept invitation.');
    } finally {
      setAccepting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-xl">Join Organization</CardTitle>
          <CardDescription>
            {error
              ? 'Something went wrong'
              : success
              ? 'Welcome aboard!'
              : `You've been invited to join ${orgName}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertTriangle className="h-10 w-10 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Link to="/login">
                <Button variant="outline">Go to Login</Button>
              </Link>
            </div>
          ) : success ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <CheckCircle className="h-10 w-10 text-primary" />
              <p className="text-sm text-muted-foreground">You've joined {orgName}. Redirecting...</p>
            </div>
          ) : !user ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-muted-foreground">
                Please log in to accept this invitation.
              </p>
              <Link to={`/login?redirect=${encodeURIComponent(`/join-org?invite=${inviteParam}`)}`}>
                <Button>Log In</Button>
              </Link>
              <p className="text-xs text-muted-foreground">
                Don't have an account?{' '}
                <Link to={`/signup?invite=${inviteParam}`} className="text-primary underline">
                  Sign up
                </Link>
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="text-sm text-muted-foreground">
                Join <strong>{orgName}</strong> as a <strong>{invitation?.role || 'member'}</strong>.
              </p>
              <Button onClick={handleAccept} disabled={accepting} className="w-full">
                {accepting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Join Organization
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
