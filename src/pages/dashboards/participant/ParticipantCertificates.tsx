import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Award, AlertTriangle, ExternalLink, Download, CheckCircle2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { CertificateService } from '../../../lib/CertificateService';
import type { CertificateMetadata } from '../../../lib/CertificateService';
import { useAuth } from '../../../contexts/AuthContext';
import { Badge } from '../../../components/ui/Badge';
import { motion } from 'framer-motion';
import { QRCodeSVG as QRCode } from 'qrcode.react';

export default function ParticipantCertificates() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<CertificateMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = CertificateService.subscribeToCertificates(user.uid, (data) => {
      setCertificates(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const handleDownload = async (cert: CertificateMetadata) => {
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById(`cert-template-${cert.certificateId}`);
      if (!element) return;
      
      // Temporarily make it visible for capture
      element.style.display = 'block';
      
      const opt = {
        margin:       0,
        filename:     `GLITCH36_${cert.type}_Certificate_${cert.ownerName.replace(/\s+/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 1.0 },
        html2canvas:  { scale: 3, useCORS: true, backgroundColor: '#000000' },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' }
      };
      
      await html2pdf().set(opt).from(element).save();
      
      // Hide again
      element.style.display = 'none';
    } catch (err) {
      console.error(err);
    }
  };

  const verifyUrl = (certId: string) => {
    return `${window.location.origin}/verify-certificate?id=${certId}`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="font-bebas text-4xl tracking-widest text-white mb-2 flex items-center gap-2">
          <Award className="w-8 h-8 text-primary" /> CERTIFICATES & AWARDS
        </h1>
        <p className="font-inter text-gray-400">View and download your official participation certificates and awards.</p>
      </div>

      <div className="space-y-6">
        {certificates.length === 0 ? (
          <Card className="border-dashed border-2 border-white/20 bg-black/50">
            <CardContent className="p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <Award className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="font-bebas text-2xl text-white mb-2 tracking-wider">NO CERTIFICATES ISSUED</h3>
              <p className="font-inter text-gray-400 text-sm leading-relaxed max-w-md mx-auto">
                Certificates and awards will appear here once they are issued by the organizers at the end of the event.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {certificates.map((cert, index) => (
              <React.Fragment key={cert.certificateId}>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                  <Card className="border-primary/30 bg-black/60 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <CardContent className="p-8">
                      <div className="flex items-start justify-between mb-6 relative z-10">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <Award className="w-6 h-6 text-primary" />
                        </div>
                        <Badge variant="outline" className={`border-primary/50 ${cert.status === 'Valid' ? 'text-green-400' : 'text-red-400'}`}>
                          {cert.status.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="relative z-10">
                        <h3 className="font-bebas text-3xl text-white tracking-wider mb-2">
                          {cert.type.toUpperCase()} CERTIFICATE
                        </h3>
                        <p className="font-inter text-gray-400 mb-6">
                          Issued to <strong className="text-white">{cert.ownerName}</strong> on {new Date(cert.issuedDate).toLocaleDateString()}
                        </p>
                        
                        <div className="flex items-center gap-4">
                          <Button className="flex-1 flex items-center justify-center gap-2" onClick={() => handleDownload(cert)}>
                            <Download className="w-4 h-4" /> DOWNLOAD PDF
                          </Button>
                          <Button variant="outline" className="flex items-center gap-2 px-4 border-white/20" onClick={() => window.open(verifyUrl(cert.certificateId), '_blank')}>
                            <CheckCircle2 className="w-4 h-4 text-green-400" /> VERIFY
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Offscreen Certificate Template for PDF Generation */}
                <div id={`cert-template-${cert.certificateId}`} style={{ display: 'none', width: '1100px', height: '850px', background: '#0a0a0a', border: '10px solid #22c55e', padding: '60px', position: 'relative', color: '#fff', boxSizing: 'border-box', fontFamily: 'sans-serif' }}>
                  <div style={{ textAlign: 'center', marginTop: '40px' }}>
                    <h1 style={{ fontSize: '64px', margin: '0', letterSpacing: '4px', color: '#22c55e' }}>GLITCH 36</h1>
                    <p style={{ fontSize: '24px', margin: '10px 0 60px 0', letterSpacing: '2px', color: '#888' }}>CERTIFICATE OF ACHIEVEMENT</p>
                    
                    <p style={{ fontSize: '20px', color: '#aaa', margin: '0 0 20px 0' }}>This is to certify that</p>
                    <h2 style={{ fontSize: '56px', margin: '0 0 40px 0', color: '#fff', borderBottom: '2px solid #333', display: 'inline-block', paddingBottom: '10px', paddingLeft: '40px', paddingRight: '40px' }}>
                      {cert.ownerName}
                    </h2>
                    
                    <p style={{ fontSize: '20px', color: '#aaa', margin: '0 0 20px 0' }}>has successfully achieved the status of</p>
                    <h3 style={{ fontSize: '42px', margin: '0 0 60px 0', color: '#22c55e', textTransform: 'uppercase' }}>
                      {cert.type}
                    </h3>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '80px', padding: '0 40px' }}>
                      <div style={{ textAlign: 'left' }}>
                        <p style={{ fontSize: '16px', color: '#888', margin: '0 0 5px 0' }}>Date of Issuance</p>
                        <p style={{ fontSize: '20px', margin: '0', color: '#fff' }}>{new Date(cert.issuedDate).toLocaleDateString()}</p>
                      </div>
                      
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '16px', color: '#888', margin: '0 0 5px 0' }}>Certificate ID</p>
                        <p style={{ fontSize: '20px', margin: '0', color: '#fff', fontFamily: 'monospace' }}>{cert.certificateId}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* QR Code */}
                  <div style={{ position: 'absolute', bottom: '60px', left: '50%', transform: 'translateX(-50%)', background: '#fff', padding: '10px', borderRadius: '8px' }}>
                    {/* We can't use React QRCode component easily in raw HTML string or hidden div unless it mounts. Wait, we CAN use it here because it renders as SVG/canvas in the DOM! */}
                    <div className="qr-container">
                      <QRCode value={verifyUrl(cert.certificateId)} size={100} level="H" />
                    </div>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
