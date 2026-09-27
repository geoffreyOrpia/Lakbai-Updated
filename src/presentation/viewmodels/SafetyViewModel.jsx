import { listChecklist, listCompletedKeys, resetChecklist, setChecklistItemCompleted } from "../../domain/usecases/safety.jsx";
import { userMessage } from "../../core/errors/appError.jsx";
import { ViewModel } from "../viewmodel/ViewModel.jsx";
/** Safety hub: preparation checklist plus offline emergency contacts from packs. */
export class SafetyViewModel extends ViewModel {
  constructor(deps, packRepository) {
    super({
      checklist: [],
      completed: [],
      contacts: [],
      loading: true
    });
    this.deps = deps;
    this.packRepository = packRepository;
  }
  onInit = () => {
    void this.load();
  };
  load = async () => {
    try {
      const [checklist, completed] = await Promise.all([listChecklist(this.deps), listCompletedKeys(this.deps)]);
      const meta = await this.packRepository.listDownloadedMeta().catch(() => []);
      const contacts = [];
      for (const entry of meta) {
        const pack = await this.packRepository.getDownloadedPack(entry.packId).catch(() => null);
        if (!pack) continue;
        for (const contact of pack.safety.emergencyContacts) {
          contacts.push({
            ...contact,
            packName: pack.destination.name
          });
        }
      }
      this.setState({
        checklist,
        completed,
        contacts,
        loading: false
      });
    } catch {
      this.setState({
        loading: false
      });
    }
  };
  toggle = async key => {
    const previous = this.state.completed;
    const nextCompleted = previous.includes(key) ? previous.filter(entry => entry !== key) : [...previous, key];
    this.setState({
      completed: nextCompleted
    });
    try {
      await setChecklistItemCompleted(this.deps, key, nextCompleted.includes(key));
      return true;
    } catch {
      this.setState({
        completed: previous
      });
      return false;
    }
  };
  reset = async () => {
    try {
      await resetChecklist(this.deps);
      this.setState({
        completed: []
      });
    } catch (error) {
      throw new Error(userMessage(error, 'The checklist could not be reset.'));
    }
  };
}
