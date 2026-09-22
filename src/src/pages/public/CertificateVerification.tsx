import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Award, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { CertificateService } from '../../lib/CertificateService';
import type { CertificateMetadata } from '../../lib/CertificateService';;
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export default function CertificateVerification() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState<CertificateMetadata | null>(null);

  useEffect(() => {
    async function verify() {
      if (!id) return;
      const data = await CertificateService.verifyCertificate(id);
      setCert(data);
      setLoading(false);
    }
    verify();
  }, [id]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-[#0a0a0a] to-[#0a0a0a] pointer-events-none" />
      
      <div className="z-10 text-center mb-8">
        <Link to="/" className="inline-block">
          <h1 className="font-bebas text-5xl tracking-[0.2em] text-white mb-2">GLITCH<span className="text-primary">36</span></h1>
        </Link>
        <p className="font-inter text-gray-400 tracking-widest uppercase text-sm">Certificate Registry</p>
      </div>

      <Card className="w-full max-w-md bg-black/60 backdrop-blur-xl border-white/10 z-10 relative overflow-hidden">
        {/* Glow effect based on status */}
        {cert?.status === 'Valid' && (
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-green-500/20 blur-3xl rounded-full pointer-events-none" />
        )}
        {cert?.status === 'Revoked' && (
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-red-500/20 blur-3xl rounded-full pointer-events-none" />
        )}

        <CardContent className="p-8 text-center">
          {loading ? (
            <div className="py-12 flex flex-col items-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="font-inter text-gray-400">Verifying cryptographically...</p>
            </div>
          ) : !cert ? (
            <div className="py-8">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="font-bebas text-3xl tracking-widest mb-2">NOT FOUND</h2>
              <p className="font-inter text-gray-400 text-sm">
                We could not locate a certificate with ID: <br />
                <span className="font-mono text-white mt-1 block">{id}</span>
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {cert.status === 'Valid' ? (
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 mb-2">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
              ) : (
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 mb-2">
                  <XCircle className="w-10 h-10 text-red-400" />
                </div>
              )}
              
              <div>
                <h2 className={`font-bebas text-4xl tracking-wider mb-1 ${cert.status === 'Valid' ? 'text-white' : 'text-gray-500 line-through'}`}>
                  {cert.status === 'Valid' ? 'VERIFIED' : 'REVOKED'}
                </h2>
                <p className="font-inter text-gray-400 text-sm">
                  This certificate was officially issued by GLITCH 36 Organizers.
                </p>
              </div>

              <div className="bg-[#111] border border-white/10 rounded-lg p-4 text-left space-y-3">
                <div>
                  <p className="text-xs font-mono text-gray-500 mb-1">ISSUED TO</p>
                  <p className="font-inter text-white font-bold">{cert.ownerName}</p>
                </div>
                <div>
                  <p className="text-xs font-mono text-gray-500 mb-1">AWARD TYPE</p>
                  <p className="font-inter text-primary flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    {cert.type}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-mono text-gray-500 mb-1">ISSUED DATE</p>
                  <p className="font-inter text-gray-300">
                    {new Date(cert.issuedDate).toLocaleDateString(undefined, { 
                      year: 'numeric', month: 'long', day: 'numeric', 
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-mono text-gray-500 mb-1">CERTIFICATE ID</p>
                  <p className="font-mono text-gray-400 text-sm break-all">{cert.certificateId}</p>
                </div>
              </div>

              {cert.status === 'Valid' && (
                <Button className="w-full h-12 text-lg">DOWNLOAD AS PDF</Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      <p className="text-center font-inter text-xs text-gray-600 mt-8 max-w-sm">
        Verification relies on the immutable GLITCH 36 database. If you suspect fraud, contact organizers immediately.
      </p>
    </div>
  );
}
