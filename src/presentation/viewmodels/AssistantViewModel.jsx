import { userMessage } from "../../core/errors/appError.jsx";
import { respondToAssistant } from "../../domain/assistant/assistantEngine.jsx";
import { destinationEntityFor, loadAssistantKnowledge } from "../../domain/assistant/assistantKnowledge.jsx";
import { ViewModel } from "../viewmodel/ViewModel.jsx";

const starterSuggestions = [
  'What can I do in Samal?',
  'Recommend a nature place',
  'What can I visit in Tagum?',
  'Plan a trip',
];

export class AssistantViewModel extends ViewModel {
  constructor(deps, locationService = null, nav = {}, initialDestinationId = null) {
    super({
      loading: true,
      busy: false,
      input: '',
      messages: [],
      knowledge: null,
      context: {},
      origin: null,
      locationStatus: 'idle',
      error: null,
    });
    this.deps = deps;
    this.locationService = locationService;
    this.nav = nav;
    this.initialDestinationId = initialDestinationId;
    this.nextMessageId = 0;
  }

  nextId = prefix => `${prefix}-${++this.nextMessageId}`;

  onInit = () => {
    void this.load();
  };

  load = async () => {
    this.setState({ loading: true, error: null });
    try {
      const knowledge = await loadAssistantKnowledge(this.deps);
      const initialEntity = this.initialDestinationId
        ? destinationEntityFor(knowledge, this.initialDestinationId)
        : null;
      const context = initialEntity
        ? {
          activeEntityId: initialEntity.id,
          activeDestinationId: initialEntity.destinationId,
        }
        : {};
      const welcome = initialEntity
        ? `Ask me about ${initialEntity.destination.name}. I can use its LakBai guide for places, directions, transport, safety, offline use, and trip planning.`
        : 'Hi, I’m Ask LakBai. I use the local guides already stored in LakBai to help you discover places, plan trips, prepare, and navigate.';
      this.setState({
        knowledge,
        context,
        messages: [{
          id: this.nextId('assistant'),
          role: 'assistant',
          text: welcome,
          suggestions: initialEntity
            ? ['What can I do there?', 'How do I get there?', 'What should I prepare?', 'Does it work offline?']
            : starterSuggestions,
          actions: [],
        }],
      });
    } catch (error) {
      this.setState({
        error: userMessage(error, 'Ask LakBai could not open the local travel knowledge.'),
      });
    } finally {
      this.setState({ loading: false });
    }
  };

  setInput = input => {
    this.setState({ input });
  };

  appendMessage = message => {
    this.setState(previous => ({
      messages: [...previous.messages, message],
    }));
  };

  resolveLocation = async () => {
    if (!this.locationService) return null;
    this.setState({ locationStatus: 'loading' });
    try {
      const granted = await this.locationService.requestPermissions();
      if (!granted) {
        this.setState({ locationStatus: 'denied' });
        return null;
      }
      const origin = await this.locationService.getCurrentFix({ purpose: 'discovery' });
      this.setState({
        origin: origin ?? null,
        locationStatus: origin ? 'ready' : 'unavailable',
      });
      return origin ?? null;
    } catch {
      this.setState({ locationStatus: 'unavailable' });
      return null;
    }
  };

  submit = async rawMessage => {
    const message = String(rawMessage ?? this.state.input).trim();
    if (!message || this.state.busy || !this.state.knowledge) return false;

    this.appendMessage({
      id: this.nextId('user'),
      role: 'user',
      text: message,
      suggestions: [],
      actions: [],
    });
    this.setState({ input: '', busy: true, error: null });

    try {
      let response = respondToAssistant({
        message,
        knowledge: this.state.knowledge,
        context: this.state.context,
        origin: this.state.origin,
      });

      if (response.needsLocation && !this.state.origin) {
        const origin = await this.resolveLocation();
        if (origin) {
          response = respondToAssistant({
            message,
            knowledge: this.state.knowledge,
            context: this.state.context,
            origin,
          });
        } else {
          response = {
            text: 'I need your current location to rank nearby places or determine whether a ferry crossing is required. You can allow location and try again, or ask about a specific destination instead.',
            suggestions: ['What can I do in Samal?', 'What can I visit in Tagum?', 'Recommend a nature place'],
            actions: [],
            context: this.state.context,
          };
        }
      }

      this.setState({
        context: response.context ?? this.state.context,
      });
      this.appendMessage({
        id: this.nextId('assistant'),
        role: 'assistant',
        text: response.text,
        suggestions: response.suggestions ?? [],
        actions: response.actions ?? [],
      });
      return true;
    } catch (error) {
      this.appendMessage({
        id: this.nextId('assistant'),
        role: 'assistant',
        text: userMessage(error, 'I could not answer that from the local LakBai guides.'),
        suggestions: starterSuggestions,
        actions: [],
      });
      return false;
    } finally {
      this.setState({ busy: false });
    }
  };

  runAction = action => {
    if (!action) return;
    if (action.type === 'open-destination') {
      this.nav.onOpenDestination?.(action.destinationId);
      return;
    }
    if (action.type === 'navigate') {
      this.nav.onOpenNavigation?.(action.navigation);
      return;
    }
    if (action.type === 'plan-trip') {
      this.nav.onPlanTrip?.(action.draft);
    }
  };

  back = () => {
    this.nav.onBack?.();
  };
}
