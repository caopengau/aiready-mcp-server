import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { auth } from '../../../auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Mail, User, Clock, Tag, MessageSquare, ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

const s3 = new S3Client({});

async function getLeads() {
  const bucketName = process.env.LEADS_BUCKET;
  if (!bucketName) return [];

  const listCommand = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: 'leads/',
  });

  const { Contents } = await s3.send(listCommand);
  if (!Contents) return [];

  const leadData = await Promise.all(
    Contents.filter((item) => item.Key?.endsWith('.json')).map(async (item) => {
      const getCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: item.Key!,
      });
      const response = await s3.send(getCommand);
      const body = await response.Body?.transformToString();
      return body ? JSON.parse(body) : null;
    })
  );

  return leadData
    .filter(Boolean)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
}

export default async function LeadsDashboard() {
  const session = await auth();
  if (!session) redirect('/admin/login');

  const leads = await getLeads();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 sm:p-10 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <div className="text-cyber-blue font-mono text-[10px] uppercase tracking-[0.4em] mb-2">
              ADMIN_DASHBOARD
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter">
              Captured Leads{' '}
              <span className="text-zinc-500 font-normal not-italic ml-4 text-2xl">
                ({leads.length})
              </span>
            </h1>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-mono uppercase tracking-widest"
          >
            <ArrowLeft size={14} /> Back to Site
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {leads.length === 0 ? (
            <div className="glass-card p-20 text-center border-white/5 bg-white/[0.02]">
              <p className="text-zinc-500 font-mono text-sm">
                NO_LEADS_FOUND_IN_SYSTEM
              </p>
            </div>
          ) : (
            leads.map((lead: any) => (
              <div
                key={lead.id}
                className="glass-card p-6 flex flex-col md:flex-row md:items-center gap-6 border-white/5 hover:border-cyber-blue/30 transition-all bg-white/[0.01]"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <User size={16} className="text-cyber-blue" />
                    <span className="font-bold text-lg">{lead.name}</span>
                    <span className="px-2 py-0.5 rounded-sm bg-zinc-800 text-zinc-400 text-[10px] font-mono uppercase tracking-widest ml-2">
                      {lead.interest}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-zinc-400 text-sm mb-4">
                    <Mail size={14} />
                    <span>{lead.email}</span>
                  </div>

                  {lead.notes && (
                    <div className="flex gap-3 bg-white/[0.02] p-4 rounded-sm border border-white/5">
                      <MessageSquare
                        size={14}
                        className="text-zinc-600 mt-1 shrink-0"
                      />
                      <p className="text-zinc-400 text-sm leading-relaxed italic">
                        "{lead.notes}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="md:text-right flex flex-col items-start md:items-end gap-3 shrink-0">
                  <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono uppercase">
                    <Clock size={12} />
                    {new Date(lead.timestamp).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-sm border border-cyber-blue/20 bg-cyber-blue/5 text-cyber-blue text-[10px] font-mono font-black uppercase tracking-widest">
                      {lead.source || 'UNKNOWN'}
                    </span>
                    <span className="px-3 py-1 rounded-sm border border-zinc-700 bg-zinc-800 text-zinc-300 text-[10px] font-mono font-black uppercase tracking-widest">
                      STATUS: {lead.status || 'NEW'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-20 border-t border-white/5 pt-10 text-center">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.4em]">
            &copy; 2026 CLAWMORE_ADMIN_PROTOCOL v0.9.4
          </p>
        </div>
      </div>
    </div>
  );
}
