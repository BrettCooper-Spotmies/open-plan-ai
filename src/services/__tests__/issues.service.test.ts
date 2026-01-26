import { describe, it, expect, vi } from 'vitest';
import { issuesService } from '../issues.service';
import { projectsService } from '../projects.service';
import { Issue } from '@/types';

// Mock the config to ensure we're using mock data
vi.mock('@/config', () => ({
  config: { api: { useMockData: true } }
}));

describe('issuesService', () => {
  describe('getAll', () => {
    it('should return all issues', async () => {
      const issues = await issuesService.getAll();
      
      expect(Array.isArray(issues)).toBe(true);
    });

    it('should return issues with required properties', async () => {
      const issues = await issuesService.getAll();
      
      if (issues.length > 0) {
        const issue = issues[0];
        
        expect(issue).toHaveProperty('id');
        expect(issue).toHaveProperty('title');
        expect(issue).toHaveProperty('description');
        expect(issue).toHaveProperty('category');
        expect(issue).toHaveProperty('severity');
        expect(issue).toHaveProperty('status');
        expect(issue).toHaveProperty('projectId');
      }
    });
  });

  describe('getById', () => {
    it('should return an issue when given a valid ID', async () => {
      const issues = await issuesService.getAll();
      const validId = issues[0]?.id;
      
      if (validId) {
        const issue = await issuesService.getById(validId);
        
        expect(issue).not.toBeNull();
        expect(issue?.id).toBe(validId);
      }
    });

    it('should return null when given an invalid ID', async () => {
      const issue = await issuesService.getById('non-existent-issue-id');
      
      expect(issue).toBeNull();
    });

    it('should return a copy of the issue, not the original', async () => {
      const issues = await issuesService.getAll();
      const validId = issues[0]?.id;
      
      if (validId) {
        const issue1 = await issuesService.getById(validId);
        const issue2 = await issuesService.getById(validId);
        
        expect(issue1).not.toBe(issue2);
      }
    });
  });

  describe('create', () => {
    it('should create a new issue with generated ID and timestamp', async () => {
      const projects = await projectsService.getAll();
      const projectId = projects[0]?.id;
      
      if (projectId) {
        const newIssueData: Omit<Issue, 'id' | 'reportedAt'> = {
          title: 'Test Issue',
          description: 'Test description',
          category: 'defect',
          severity: 'major',
          status: 'open',
          projectId,
          reportedBy: {
            id: 'user-1',
            name: 'Test User',
            email: 'test@example.com',
            role: 'Engineer',
            initials: 'TU',
          },
        };

        const createdIssue = await issuesService.create(projectId, newIssueData);
        
        expect(createdIssue).toHaveProperty('id');
        expect(createdIssue.id).toMatch(/^issue-/);
        expect(createdIssue).toHaveProperty('reportedAt');
        expect(createdIssue.title).toBe(newIssueData.title);
        expect(createdIssue.projectId).toBe(projectId);
      }
    });

    it('should throw error when project does not exist', async () => {
      await expect(
        issuesService.create('non-existent-project', {
          title: 'Test',
          description: 'Test',
          category: 'defect',
          severity: 'minor',
          status: 'open',
          projectId: 'non-existent-project',
          reportedBy: {
            id: 'user-1',
            name: 'Test',
            email: 'test@test.com',
            role: 'Dev',
            initials: 'T',
          },
        })
      ).rejects.toThrow('Project not found');
    });

    it('should add the issue to the project', async () => {
      const projects = await projectsService.getAll();
      const projectId = projects[0]?.id;
      
      if (projectId) {
        const createdIssue = await issuesService.create(projectId, {
          title: 'Another Test Issue',
          description: 'Another test',
          category: 'risk',
          severity: 'critical',
          status: 'open',
          projectId,
          reportedBy: {
            id: 'user-1',
            name: 'Test User',
            email: 'test@example.com',
            role: 'Engineer',
            initials: 'TU',
          },
        });

        const issue = await issuesService.getById(createdIssue.id);
        expect(issue).not.toBeNull();
      }
    });
  });

  describe('update', () => {
    it('should update an existing issue', async () => {
      const issues = await issuesService.getAll();
      const issueToUpdate = issues[0];
      
      if (issueToUpdate) {
        const updates = { 
          title: 'Updated Issue Title', 
          status: 'investigating' as const 
        };
        
        const updatedIssue = await issuesService.update(issueToUpdate.id, updates);
        
        expect(updatedIssue.title).toBe('Updated Issue Title');
        expect(updatedIssue.status).toBe('investigating');
      }
    });

    it('should throw error when issue does not exist', async () => {
      await expect(
        issuesService.update('non-existent-issue', { title: 'Test' })
      ).rejects.toThrow('Issue not found');
    });

    it('should preserve existing properties when partially updating', async () => {
      const issues = await issuesService.getAll();
      const issueToUpdate = issues[0];
      
      if (issueToUpdate) {
        const originalSeverity = issueToUpdate.severity;
        
        const updatedIssue = await issuesService.update(
          issueToUpdate.id,
          { title: 'Partially Updated Issue' }
        );
        
        expect(updatedIssue.title).toBe('Partially Updated Issue');
        expect(updatedIssue.severity).toBe(originalSeverity);
      }
    });

    it('should update issue status transitions', async () => {
      const issues = await issuesService.getAll();
      const openIssue = issues.find(i => i.status === 'open');
      
      if (openIssue) {
        // Transition from open to investigating
        let updatedIssue = await issuesService.update(openIssue.id, { 
          status: 'investigating' 
        });
        expect(updatedIssue.status).toBe('investigating');

        // Transition from investigating to resolved
        updatedIssue = await issuesService.update(openIssue.id, { 
          status: 'resolved',
          resolution: 'Fixed the issue' 
        });
        expect(updatedIssue.status).toBe('resolved');
        expect(updatedIssue.resolution).toBe('Fixed the issue');
      }
    });
  });

  describe('delete', () => {
    it('should delete an existing issue', async () => {
      const projects = await projectsService.getAll();
      const projectId = projects[0]?.id;
      
      if (projectId) {
        // Create an issue to delete
        const newIssue = await issuesService.create(projectId, {
          title: 'Issue to Delete',
          description: 'Will be deleted',
          category: 'other',
          severity: 'trivial',
          status: 'open',
          projectId,
          reportedBy: {
            id: 'user-1',
            name: 'Test',
            email: 'test@test.com',
            role: 'Dev',
            initials: 'T',
          },
        });

        const issueBeforeDelete = await issuesService.getById(newIssue.id);
        expect(issueBeforeDelete).not.toBeNull();

        await issuesService.delete(newIssue.id);

        const issueAfterDelete = await issuesService.getById(newIssue.id);
        expect(issueAfterDelete).toBeNull();
      }
    });

    it('should not throw when deleting non-existent issue', async () => {
      await expect(
        issuesService.delete('non-existent-issue')
      ).resolves.not.toThrow();
    });
  });

  describe('getOpenCount', () => {
    it('should return count of open and critical issues', async () => {
      const counts = await issuesService.getOpenCount();
      
      expect(counts).toHaveProperty('total');
      expect(counts).toHaveProperty('critical');
      expect(typeof counts.total).toBe('number');
      expect(typeof counts.critical).toBe('number');
      expect(counts.total).toBeGreaterThanOrEqual(0);
      expect(counts.critical).toBeGreaterThanOrEqual(0);
      expect(counts.critical).toBeLessThanOrEqual(counts.total);
    });

    it('should count correctly based on status', async () => {
      const allIssues = await issuesService.getAll();
      const openIssues = allIssues.filter(
        i => i.status === 'open' || i.status === 'investigating'
      );
      const criticalOpenIssues = openIssues.filter(i => i.severity === 'critical');
      
      const counts = await issuesService.getOpenCount();
      
      expect(counts.total).toBe(openIssues.length);
      expect(counts.critical).toBe(criticalOpenIssues.length);
    });

    it('should update count after creating new issue', async () => {
      const projects = await projectsService.getAll();
      const projectId = projects[0]?.id;
      
      if (projectId) {
        const initialCounts = await issuesService.getOpenCount();
        
        await issuesService.create(projectId, {
          title: 'New Critical Issue for Count Test',
          description: 'Critical issue',
          category: 'defect',
          severity: 'critical',
          status: 'open',
          projectId,
          reportedBy: {
            id: 'user-1',
            name: 'Test',
            email: 'test@test.com',
            role: 'Dev',
            initials: 'T',
          },
        });

        const newCounts = await issuesService.getOpenCount();
        
        // New issue should increase count
        expect(newCounts.total).toBeGreaterThan(initialCounts.total);
        expect(newCounts.critical).toBeGreaterThan(initialCounts.critical);
      }
    });

    it('should not count resolved or closed issues', async () => {
      const projects = await projectsService.getAll();
      const projectId = projects[0]?.id;
      
      if (projectId) {
        // Create a fresh open issue to resolve
        const newIssue = await issuesService.create(projectId, {
          title: 'Issue to Resolve for Count Test',
          description: 'Will be resolved',
          category: 'defect',
          severity: 'minor',
          status: 'open',
          projectId,
          reportedBy: {
            id: 'user-1',
            name: 'Test',
            email: 'test@test.com',
            role: 'Dev',
            initials: 'T',
          },
        });
        
        const initialCounts = await issuesService.getOpenCount();
        
        // Resolve the issue
        await issuesService.update(newIssue.id, { status: 'resolved' });
        
        const newCounts = await issuesService.getOpenCount();
        
        // Total should decrease after resolving
        expect(newCounts.total).toBeLessThan(initialCounts.total);
      }
    });
  });
});
