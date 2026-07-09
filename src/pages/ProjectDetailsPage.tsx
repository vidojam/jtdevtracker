        <button
          type="button"
          style={{ background: '#fcc', color: '#900', fontSize: '14px', padding: '8px 16px', borderRadius: '4px', marginBottom: '8px', border: '2px solid #c99', fontWeight: 'bold', marginLeft: '8px' }}
          onClick={() => {
            if ('speechSynthesis' in window) {
              window.speechSynthesis.cancel();
            }
          }}
        >
          Stop Speaking
        </button>
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useProjects } from '../context/ProjectContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import LoadingOverlay from '../components/ui/LoadingOverlay';
import { useVoiceRecognition } from '../utils/useVoiceRecognition';
import { speakWithPreferredVoice, useSpeechVoice } from '../utils/speechVoice';

export default function ProjectDetailsPage() {
  const { projectId } = useParams();
  const { projects, addAction, deleteAction, actionLoading, isLoading } = useProjects();
  const { selectedVoiceName } = useSpeechVoice();
  const [todayAction, setTodayAction] = useState('');
  const [todayActionNotes, setTodayActionNotes] = useState('');
  const [error, setError] = useState('');
  const [deleteActionId, setDeleteActionId] = useState<string | null>(null);

  // Voice recognition hook
  const { transcript, isListening, error: voiceError, start, stop } = useVoiceRecognition();

  // Debug: log recognition lifecycle
  React.useEffect(() => {
    console.log('Recognition listening:', isListening);
  }, [isListening]);
  React.useEffect(() => {
    if (voiceError) console.error('Recognition error:', voiceError);
  }, [voiceError]);

  // Start listening on mount, and stop on unmount
  React.useEffect(() => {
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Find the current project first
  const project = useMemo(() => projects.find((item) => item.id === projectId), [projects, projectId]);

  // When transcript updates, fill fields
  const [spokenText, setSpokenText] = React.useState('');
  React.useEffect(() => {
    if (!transcript || !project) return;
    const trigger = /jt ?dev ?tracker/i;
    if (!trigger.test(transcript)) return;

    let speakText = `Project name: ${project.name}. `;
    speakText += `Purpose: ${project.purpose}. `;
    // Find latest action (by date)
    const latestAction = project.actions && project.actions.length > 0
      ? [...project.actions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      : null;
    if (latestAction) {
      if (latestAction.lastAction) speakText += `Last action: ${latestAction.lastAction}. `;
      if (latestAction.todayAction) speakText += `Today's action: ${latestAction.todayAction}. `;
      if (latestAction.todayActionNotes) speakText += `Planned next steps: ${latestAction.todayActionNotes}. `;
    } else {
      speakText += 'No project history available.';
    }
    setSpokenText(speakText);
    console.log('Speaking:', speakText);
    if ('speechSynthesis' in window) {
      try {
        stop(); // Stop recognition before speaking
        speakWithPreferredVoice(speakText, selectedVoiceName, () => {
          setTimeout(() => {
            start(); // Restart recognition after a short delay
          }, 500);
        });
        // Fallback: alert if not spoken after 5 seconds
        setTimeout(() => {
          if (window.speechSynthesis.speaking) {
            alert('Speech synthesis did not finish. Your browser may be blocking audio output.');
          }
        }, 5000);
      } catch (err) {
        alert('Speech synthesis failed: ' + err);
        start(); // Try to restart recognition even on error
      }
    } else {
      alert('Speech synthesis is not supported in this browser.');
      start();
    }
    // Only run this effect when transcript changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]);

  if (isLoading) {
    return <p className="text-sm text-slate-600 dark:text-slate-300">Loading project...</p>;
  }

  if (!project) {
    return (
      <Card>
        <p className="mb-3 text-sm">Project not found.</p>
        <Link to="/" className="text-sm underline">Back To Project Dashboard</Link>
      </Card>
    );
  }

  const orderedActions = [...project.actions].sort((a, b) => b.date.getTime() - a.date.getTime());

  const submitAction = async (event: FormEvent) => {
    event.preventDefault();
    if (!todayAction.trim() || !todayActionNotes.trim()) {
      setError('Today\'s action and notes are required');
      return;
    }
    setError('');
    await addAction(project.id, { todayAction, todayActionNotes });
    setTodayAction('');
    setTodayActionNotes('');
  };

  return (
    <div className="space-y-4">
      <LoadingOverlay visible={actionLoading} />
      <Card className="border-sky-300 bg-sky-100 dark:border-sky-700/60 dark:bg-slate-900">
        <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
          <button
            type="button"
            style={{ background: '#cce', color: '#222', fontSize: '14px', padding: '8px 16px', borderRadius: '4px', border: '2px solid #99c', fontWeight: 'bold' }}
            onClick={() => {
              if (!project) return;
              let speakText = `Project name: ${project.name}. `;
              speakText += `Purpose: ${project.purpose}. `;
              const latestAction = project.actions && project.actions.length > 0
                ? [...project.actions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
                : null;
              if (latestAction) {
                if (latestAction.lastAction) speakText += `Last action: ${latestAction.lastAction}. `;
                if (latestAction.todayAction) speakText += `Today's action: ${latestAction.todayAction}. `;
                if (latestAction.todayActionNotes) speakText += `Planned next steps: ${latestAction.todayActionNotes}. `;
              } else {
                speakText += 'No project history available.';
              }
              speakWithPreferredVoice(speakText, selectedVoiceName);
            }}
          >
            Read Project History
          </button>
          <button
            type="button"
            style={{ background: '#fcc', color: '#900', fontSize: '14px', padding: '8px 16px', borderRadius: '4px', border: '2px solid #c99', fontWeight: 'bold' }}
            onClick={() => {
              if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
              }
            }}
          >
            Stop Speaking
          </button>
        </div>
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{project.name}</h1>
          <Link to="/" className="text-sm underline">Back To Project Dashboard</Link>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">Purpose: {project.purpose}</p>
        <p className="text-sm text-slate-600 dark:text-slate-300">Program Deploy: {project.programDeployed ? 'Yes' : 'No'}</p>
        <Link to={`/project/${project.id}/tech-stack`} className="inline-block text-sm font-medium text-sky-700 underline dark:text-sky-300">
          Tech Stack →
        </Link>
        <Link to={`/project/${project.id}/snapshots`} className="block text-sm font-medium text-sky-700 underline dark:text-sky-300">
          Project Snapshots →
        </Link>
        <Link to={`/project/${project.id}/deployment-information`} className="block text-sm font-medium text-sky-700 underline dark:text-sky-300">
          Deployment Information →
        </Link>
        {project.tags.length > 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">Tags: {project.tags.join(', ')}</p>
        ) : null}
        <p className="text-sm text-slate-600 dark:text-slate-300">Initiation Date: {project.initiationDate.toLocaleDateString()}</p>
      </Card>

      <Card className="border-sky-300 bg-sky-100/90 dark:border-sky-700/60 dark:bg-slate-900/95">
        <h2 className="mb-3 text-lg font-semibold">Add Daily Action</h2>
        <div className="flex flex-col gap-1 mb-2">
          <span className="text-xs">Listening: {isListening ? 'Yes' : 'No'}</span>
          <span className="text-xs">Transcript: {transcript || '(none)'}</span>
          {voiceError ? <span className="text-xs text-red-600">{voiceError}</span> : null}
          {spokenText ? (
            <span className="text-xs text-blue-700">Speaking: {spokenText}</span>
          ) : null}
        </div>
        <form className="grid gap-3" onSubmit={submitAction}>
          <Input
            label="Today's Action"
            as="textarea"
            value={todayAction}
            onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setTodayAction(event.target.value)}
          />
          <Input
            label="Planned Next Steps"
            as="textarea"
            value={todayActionNotes}
            onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setTodayActionNotes(event.target.value)}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div>
            <Button type="submit">Add Action</Button>
          </div>
        </form>
      </Card>

      <Card className="border-sky-300 bg-sky-100/90 dark:border-sky-700/60 dark:bg-slate-900/95">
        <h2 className="mb-3 text-lg font-semibold">Project History</h2>
        <div className="space-y-3">
          {orderedActions.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">No actions logged yet.</p>
          ) : (
            orderedActions.map((action) => (
              <div key={action.id} className="rounded-md border border-sky-300 bg-white p-3 dark:border-sky-700/50 dark:bg-slate-800/85">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium">Date: {action.date.toLocaleString()}</p>
                  <Button variant="danger" onClick={() => setDeleteActionId(action.id)}>Delete</Button>
                </div>
                <p className="text-sm"><span className="font-medium">Planned Next Steps:</span> {action.todayActionNotes}</p>
                <p className="text-sm"><span className="font-medium">Last Action:</span> {action.lastAction || '-'}</p>
                <p className="text-sm"><span className="font-medium">Last Action Notes:</span> {action.lastActionNotes || '-'}</p>
                <p className="text-sm"><span className="font-medium">Today's Action:</span> {action.todayAction}</p>
              </div>
            ))
          )}
        </div>
      </Card>

      <Modal title="Delete Action" open={Boolean(deleteActionId)} onClose={() => setDeleteActionId(null)}>
        <p className="mb-4 text-sm">Delete this action entry?</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteActionId(null)}>Cancel</Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (!deleteActionId) return;
              await deleteAction(project.id, deleteActionId);
              setDeleteActionId(null);
            }}
          >
            Confirm Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
