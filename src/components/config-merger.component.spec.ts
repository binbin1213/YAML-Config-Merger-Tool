import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';

import { ConfigMergerComponent } from './config-merger.component';
import { YamlProcessorService } from '../services/yaml-processor.service';
import { HighlightService } from '../services/highlight.service';
import { CommonModule } from '@angular/common';

describe('ConfigMergerComponent', () => {
  let component: ConfigMergerComponent;
  let fixture: ComponentFixture<ConfigMergerComponent>;
  let mockYamlService: jasmine.SpyObj<YamlProcessorService>;
  let mockHighlightService: jasmine.SpyObj<HighlightService>;
  let mockSanitizer: jasmine.SpyObj<DomSanitizer>;

  const mockTemplate = `
    port: 7890
    proxies:
      - name: 直连
        type: direct
  `;

  const mockUserConfig = `
    proxies:
      - name: "香港节点"
        type: ss
  `;

  beforeEach(async () => {
    mockYamlService = jasmine.createSpyObj('YamlProcessorService', [
      'mergeConfigs',
      'parse',
      'getHighlightedKeys'
    ]);
    mockHighlightService = jasmine.createSpyObj('HighlightService', [
      'highlight',
      'highlightElement',
      'highlightAll'
    ]);
    mockSanitizer = jasmine.createSpyObj('DomSanitizer', ['bypassSecurityTrustHtml', 'sanitize']);

    mockYamlService.mergeConfigs.and.returnValue('# merged result');
    mockYamlService.parse.and.returnValue({
      port: 7890,
      proxies: []
    });
    mockYamlService.getHighlightedKeys.and.returnValue(new Set(['proxies']));
    mockHighlightService.highlight.and.returnValue('<code>highlighted</code>');
    mockSanitizer.bypassSecurityTrustHtml.and.returnValue('<code>safe</code>' as any);
    mockSanitizer.sanitize.and.returnValue('safe text');

    await TestBed.configureTestingModule({
      imports: [ConfigMergerComponent, CommonModule],
      providers: [
        { provide: YamlProcessorService, useValue: mockYamlService },
        { provide: HighlightService, useValue: mockHighlightService },
        { provide: DomSanitizer, useValue: mockSanitizer }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfigMergerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default template', () => {
    fixture.detectChanges();

    expect(component.templateContent()).toBeDefined();
    expect(component.templateContent().length).toBeGreaterThan(0);
    expect(component.templateContent()).toContain('proxy-groups');
  });

  it('should have initial signals set correctly', () => {
    fixture.detectChanges();

    expect(component.compatibilityMode()).toBe(false);
    expect(component.currentStep()).toBe(1);
    expect(component.isProcessing()).toBe(false);
    expect(component.mergedOutput()).toBeDefined();
  });

  describe('copyToClipboard', () => {
    it('should copy text to clipboard and show success message', (done) => {
      spyOn(navigator.clipboard, 'writeText').and.resolveTo();

      component.copyToClipboard('test text');

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test text');
      expect(component.statusMessage()).toBe('已复制到剪贴板！');

      setTimeout(() => {
        expect(component.statusMessage()).toBe('');
        done();
      }, 2100); // Slightly longer than STATUS_MESSAGE_DURATION
    });

    it('should show error message on clipboard failure', (done) => {
      spyOn(navigator.clipboard, 'writeText').and.rejectWith(new Error('Copy failed'));
      spyOn(console, 'error');

      component.copyToClipboard('test text');

      expect(component.statusMessage()).toBe('复制失败！');

      setTimeout(() => {
        expect(component.statusMessage()).toBe('');
        done();
      }, 2100);
    });
  });

  describe('copyTemplate', () => {
    it('should copy template content', () => {
      spyOn(component, 'copyToClipboard');
      component.templateContent.set('test template');

      component.copyTemplate();

      expect(component.copyToClipboard).toHaveBeenCalledWith('test template');
    });
  });

  describe('clearTemplate', () => {
    it('should clear template and process merge', () => {
      spyOn(component, 'processMerge');
      component.templateContent.set('some content');

      component.clearTemplate();

      expect(component.templateContent()).toBe('');
      expect(component.processMerge).toHaveBeenCalled();
    });
  });

  describe('copyUser', () => {
    it('should copy user content', () => {
      spyOn(component, 'copyToClipboard');
      component.userContent.set('test user');

      component.copyUser();

      expect(component.copyToClipboard).toHaveBeenCalledWith('test user');
    });
  });

  describe('clearUser', () => {
    it('should clear user content and process merge', () => {
      spyOn(component, 'processMerge');
      component.userContent.set('some content');

      component.clearUser();

      expect(component.userContent()).toBe('');
      expect(component.processMerge).toHaveBeenCalled();
    });
  });

  describe('copyMergedOutput', () => {
    it('should extract plain text and copy to clipboard', () => {
      spyOn(component, 'copyToClipboard');
      spyOn(document, 'createElement').and.callThrough();

      component.copyMergedOutput();

      expect(component.copyToClipboard).toHaveBeenCalled();
    });
  });

  describe('toggleCompatibility', () => {
    it('should toggle compatibility mode and process merge', () => {
      spyOn(component, 'processMerge');
      component.compatibilityMode.set(false);

      component.toggleCompatibility();

      expect(component.compatibilityMode()).toBe(true);
      expect(component.processMerge).toHaveBeenCalled();
    });
  });

  describe('processMerge', () => {
    it('should not process if already processing', () => {
      component.isProcessing.set(true);
      spyOn(component, 'processMerge').and.callThrough();

      component.processMerge();

      expect(mockYamlService.mergeConfigs).not.toHaveBeenCalled();
    });

    it('should set waiting message if content is empty', () => {
      component.templateContent.set('');
      component.userContent.set('');
      component.isProcessing.set(false);

      component.processMerge();

      expect(component.statusMessage()).toBe('等待输入...');
      expect(mockYamlService.mergeConfigs).not.toHaveBeenCalled();
    });

    it('should merge configs and show success message', (done) => {
      component.templateContent.set(mockTemplate);
      component.userContent.set(mockUserConfig);
      component.isProcessing.set(false);

      component.processMerge();

      setTimeout(() => {
        expect(mockYamlService.mergeConfigs).toHaveBeenCalledWith(
          mockTemplate,
          mockUserConfig,
          false
        );
        expect(mockHighlightService.highlight).toHaveBeenCalled();
        expect(component.statusMessage()).toContain('合并成功');
        expect(component.isProcessing()).toBe(false);
        done();
      }, 50);
    });

    it('should handle errors gracefully', (done) => {
      component.templateContent.set('invalid {{{ yaml');
      component.userContent.set(mockUserConfig);
      mockYamlService.mergeConfigs.and.throwError(new Error('Invalid YAML'));

      component.processMerge();

      setTimeout(() => {
        expect(component.statusMessage()).toContain('错误');
        expect(component.isProcessing()).toBe(false);
        done();
      }, 50);
    });

    it('should update current step to 3 on success', (done) => {
      component.templateContent.set(mockTemplate);
      component.userContent.set(mockUserConfig);
      component.currentStep.set(1);

      component.processMerge();

      setTimeout(() => {
        expect(component.currentStep()).toBe(3);
        done();
      }, 50);
    });
  });

  describe('handleFileUpload', () => {
    const createMockFile = (name: string, size: number, type: string): File => {
      const file = new File(['content'], name, { type });
      Object.defineProperty(file, 'size', { value: size });
      return file;
    };

    it('should reject files larger than MAX_FILE_SIZE', (done) => {
      const largeFile = createMockFile('large.yaml', 10 * 1024 * 1024, 'text/yaml'); // 10MB

      component.handleFileUpload(largeFile, 'template');

      expect(component.statusMessage()).toContain('错误：文件大小不能超过');
      setTimeout(() => {
        expect(component.statusMessage()).toBe('');
        done();
      }, 2100);
    });

    it('should reject files with invalid extensions', (done) => {
      const invalidFile = createMockFile('config.txt', 1024, 'text/plain');

      component.handleFileUpload(invalidFile, 'template');

      expect(component.statusMessage()).toContain('错误：仅支持 YAML');
      setTimeout(() => {
        expect(component.statusMessage()).toBe('');
        done();
      }, 2100);
    });

    it('should reject files with invalid YAML content', (done) => {
      const invalidYamlFile = createMockFile('invalid.yaml', 1024, 'text/yaml');
      spyOn(mockYamlService, 'parse').and.throwError(new Error('Invalid YAML'));

      component.handleFileUpload(invalidYamlFile, 'template');

      setTimeout(() => {
        expect(component.statusMessage()).toContain('错误：无效的 YAML 文件内容');
        done();
      }, 100);
    });

    it('should accept valid YAML files and set content', (done) => {
      const validFile = createMockFile('valid.yaml', 1024, 'text/yaml');
      spyOn(mockYamlService, 'parse').and.returnValue({ port: 7890 });
      spyOn(component, 'processMerge');

      component.handleFileUpload(validFile, 'template');

      setTimeout(() => {
        expect(component.templateContent()).toBeDefined();
        expect(component.statusMessage()).toContain('模版文件已加载');
        expect(component.processMerge).toHaveBeenCalled();
        done();
      }, 100);
    });
  });

  describe('downloadResult', () => {
    it('should not download if no merged output', () => {
      component.mergedOutput.set(null as any);
      spyOn(window.URL, 'createObjectURL');

      component.downloadResult();

      expect(window.URL.createObjectURL).not.toHaveBeenCalled();
    });

    it('should create blob and trigger download', () => {
      component.mergedOutput.set('<code>result</code>' as any);
      spyOn(document, 'createElement').and.callThrough();
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:url');
      spyOn(window.URL, 'revokeObjectURL');

      component.downloadResult();

      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(window.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('drag and drop', () => {
    it('should handle drag over event', () => {
      const event = new DragEvent('dragover');
      spyOn(event, 'preventDefault');

      component.onDragOver(event, 'template');

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.isDraggingOver()).toBe('template');
    });

    it('should handle drag leave event', () => {
      const event = new DragEvent('dragleave');
      spyOn(event, 'preventDefault');

      component.onDragLeave(event, 'template');

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.isDraggingOver()).toBeNull();
    });

    it('should handle drop event', () => {
      const event = new DragEvent('drop');
      spyOn(event, 'preventDefault');
      spyOn(event, 'stopPropagation');

      Object.defineProperty(event, 'dataTransfer', {
        value: {
          files: [new File(['content'], 'test.yaml', { type: 'text/yaml' })]
        },
        writable: false
      });

      spyOn(component, 'handleFileUpload');

      component.onDrop(event, 'template');

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.isDraggingOver()).toBeNull();
      expect(component.handleFileUpload).toHaveBeenCalled();
    });
  });

  describe('compatibility mode', () => {
    it('should toggle correctly', () => {
      component.compatibilityMode.set(false);
      expect(component.compatibilityMode()).toBe(false);

      component.toggleCompatibility();
      expect(component.compatibilityMode()).toBe(true);

      component.toggleCompatibility();
      expect(component.compatibilityMode()).toBe(false);
    });
  });

  describe('current step tracking', () => {
    it('should update step when template changes', () => {
      const mockEvent = { target: { value: 'new template' } } as any;

      component.updateTemplate(mockEvent);

      expect(component.currentStep()).toBe(1);
    });

    it('should update step when user content changes', () => {
      const mockEvent = { target: { value: 'new user' } } as any;

      component.updateUser(mockEvent);

      expect(component.currentStep()).toBe(2);
    });
  });
});
