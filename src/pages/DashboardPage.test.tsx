import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProjectProvider } from '../context/ProjectContext';
import DashboardPage from './DashboardPage';

describe('DashboardPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows validation errors when required fields are empty', async () => {
    render(
      <ProjectProvider>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </ProjectProvider>,
    );

    await screen.findByText('Project Dashboard');

    await userEvent.click(screen.getByRole('button', { name: 'Add Project' }));

    expect(screen.getByText('Project name is required')).toBeInTheDocument();
    expect(screen.getByText('Initiation date is required')).toBeInTheDocument();
    expect(screen.getByText('Purpose is required')).toBeInTheDocument();
  });

  it('filters projects when clicking a tag chip', async () => {
    localStorage.setItem(
      'jt-dev-tracker-projects',
      JSON.stringify([
        {
          id: '1',
          name: 'Project Alpha',
          initiationDate: '2026-03-01T00:00:00.000Z',
          purpose: 'Frontend work',
          colorCode: '#E0F2FE',
          tags: ['frontend', 'ui'],
          actions: [],
        },
        {
          id: '2',
          name: 'Project Beta',
          initiationDate: '2026-03-02T00:00:00.000Z',
          purpose: 'API work',
          colorCode: '#DCFCE7',
          tags: ['backend'],
          actions: [],
        },
      ]),
    );

    render(
      <ProjectProvider>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </ProjectProvider>,
    );

    await screen.findByText('Project Dashboard');

    await screen.findByRole('heading', { name: 'Project Alpha' });
    await screen.findByRole('heading', { name: 'Project Beta' });

    await userEvent.click(screen.getByRole('button', { name: '#frontend' }));

    expect(screen.getByLabelText('Search by name or purpose')).toHaveValue('frontend');
    expect(screen.getByRole('heading', { name: 'Project Alpha' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Project Beta' })).not.toBeInTheDocument();
  });

  it('clears filter and restores full list', async () => {
    localStorage.setItem(
      'jt-dev-tracker-projects',
      JSON.stringify([
        {
          id: '1',
          name: 'Project Alpha',
          initiationDate: '2026-03-01T00:00:00.000Z',
          purpose: 'Frontend work',
          colorCode: '#E0F2FE',
          tags: ['frontend', 'ui'],
          actions: [],
        },
        {
          id: '2',
          name: 'Project Beta',
          initiationDate: '2026-03-02T00:00:00.000Z',
          purpose: 'API work',
          colorCode: '#DCFCE7',
          tags: ['backend'],
          actions: [],
        },
      ]),
    );

    render(
      <ProjectProvider>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </ProjectProvider>,
    );

    await screen.findByRole('heading', { name: 'Project Alpha' });
    await screen.findByRole('heading', { name: 'Project Beta' });

    await userEvent.click(screen.getByRole('button', { name: '#frontend' }));
    expect(screen.queryByRole('heading', { name: 'Project Beta' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Clear Filter' }));
    expect(screen.getByLabelText('Search by name or purpose')).toHaveValue('');
    expect(screen.getByRole('heading', { name: 'Project Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Project Beta' })).toBeInTheDocument();
  });
});
