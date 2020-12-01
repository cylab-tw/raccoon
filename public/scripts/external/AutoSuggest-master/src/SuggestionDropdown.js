import { data, createNode } from './Utilities';

class SuggestionDropdown {
    constructor() {
        this.width = 0;
        this.isEmpty = true;
        this.isActive = false;

        this.dropdownContent = document.createElement('ul');
        this.dropdownContent.className = 'dropdown-menu dropdown-menu-left';

        this.dropdown = document.createElement('div');
        this.dropdown.className = 'dropdown open';
        this.dropdown.style.position = 'absolute';

        this.hide();
        this.dropdown.appendChild(this.dropdownContent);
        document.body.appendChild(this.dropdown);
    }

    show(position) {
        if (position) {
            this.dropdown.style.left = `${position.left}px`;
            this.dropdown.style.top = `${position.top}px`;

            if ((position.left + this.width) > document.body.offsetWidth) {
                this.dropdownContent.classList.remove('dropdown-menu-left');
                this.dropdownContent.classList.add('dropdown-menu-right');
            } else {
                this.dropdownContent.classList.remove('dropdown-menu-right');
                this.dropdownContent.classList.add('dropdown-menu-left');
            }
        }

        this.dropdown.style.display = 'block';
        this.isActive = true;
    }

    hide() {
        this.dropdown.style.display = 'none';
        this.isActive = false;
    }

    empty() {
        this.dropdownContent.innerHTML = '';
        this.isEmpty = true;
    }

    fill(suggestions, onSet) {
        this.empty();
        suggestions.forEach(suggestion => {
            const dropdownLink = createNode(`<li><a>${suggestion.show}</a></li>`);
            this.dropdownContent.appendChild(dropdownLink);
            data(dropdownLink, 'suggestion', suggestion);

            dropdownLink.addEventListener('mouseenter', () => {
                this.getActive().classList.remove('active');
                dropdownLink.classList.add('active');
            });

            dropdownLink.addEventListener('mousedown', (e) => {
                onSet(suggestion);
                this.hide();
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // Calculate width
        if (!this.isActive) {
            this.show();
        }

        this.width = this.dropdownContent.offsetWidth;

        if (!this.isActive) {
            this.hide();
        }

        this.setActive();
        this.isEmpty = false;
    }

    showLoader(position) {
        this.empty();
        this.dropdownContent.innerHTML = '<div class="autosuggest-loader">Loading...</div>';
        this.show(position);
        this.isActive = false;
    }

    getActive() {
        const activeLinks = Array.prototype.slice.call(this.dropdownContent.querySelectorAll('li.active'), 0);
        while (activeLinks[1]) {
            activeLinks.pop().classList.remove('active');
        }

        return activeLinks[0];
    }

    getValue(element) {
        return data((element || this.getActive()), 'suggestion');
    }

    setActive(element = this.dropdownContent.firstElementChild, activeLink) {
        activeLink && activeLink.classList.remove('active');
        element.classList.add('active');
    }

    selectNext() {
        const activeLink = this.getActive();
        const nextLink = activeLink.nextElementSibling || this.dropdownContent.firstElementChild;
        this.setActive(nextLink, activeLink);
    }

    selectPrev() {
        const activeLink = this.getActive();
        const prevLink = activeLink.previousElementSibling || this.dropdownContent.lastElementChild;
        this.setActive(prevLink, activeLink);
    }
}

export default SuggestionDropdown;
