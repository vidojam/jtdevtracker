import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProjectProvider } from '../context/ProjectContext';
import App from '../App';

describe('ProjectSnapshots navigation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows captured screen data after clicking Project Snapshots in details view', async () => {
    localStorage.setItem(
      'jt-dev-tracker-projects',
      JSON.stringify([
        {
          id: 'project-1',
          name: 'Tracker Project',
          initiationDate: '2026-03-01T00:00:00.000Z',
          purpose: 'Test snapshots route',
          programDeployed: false,
          techStack: [{ name: 'React 19', url: '' }],
          colorCode: '#E0F2FE',
          tags: ['frontend'],
          actions: [
            {
              id: 'action-1',
              date: '2026-03-23T09:00:00.000Z',
              todayAction: 'Added snapshots page',
              todayActionNotes: 'Wire snapshots from details page',
            },
          ],
          snapshots: [
            {
              id: 'snap-1',
              date: '2026-03-23T10:00:00.000Z',
              trigger: 'project-updated',
            },
          ],
        },
      ]),
    );

    render(
      <ProjectProvider>
        <MemoryRouter initialEntries={['/project/project-1']}>
          <App />
        </MemoryRouter>
      </ProjectProvider>,
    );

    await screen.findByRole('heading', { name: 'Tracker Project' });

    await userEvent.click(screen.getByRole('link', { name: /Project Snapshots/i }));

    await screen.findByRole('heading', { name: /Tracker Project — Project Snapshots/i });
    expect(screen.getByText(/Purpose:/)).toBeInTheDocument();
    expect(screen.getByText(/Test snapshots route/)).toBeInTheDocument();
    expect(screen.getByText(/Program Deploy:/)).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getByText(/Total Actions:/)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(/Last Action:/)).toBeInTheDocument();
    expect(screen.getByText(/Added snapshots page/)).toBeInTheDocument();
    expect(screen.getByText('• React 19')).toBeInTheDocument();
  });
});
